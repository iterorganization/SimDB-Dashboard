/**
 * Vite dev server only (`make dev`): SimDB servers from dev-servers.json
 * (+ dev-servers.local.json), proxied at /simdb/<name>, with a generated
 * runtime-config.js. Servers behind a firewall: login with
 * SIMDB_DEV_FIREWALL_PASSWORD, and requests need the per-run token from the
 * startup URL.
 */
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { userInfo } from 'node:os'
import { resolve } from 'node:path'
import type { Plugin, ProxyOptions } from 'vite'

/** Login at a firewall / reverse proxy in front of the SimDB server. */
export type Firewall = {
  /** "basic": HTTP Basic login on the server URL, then reuse the session cookie. */
  type: 'basic'
  /** User-Agent sent to the firewall, if it needs one (ITER F5: "it_script_basic"). */
  userAgent?: string
  /** Defaults to SIMDB_DEV_FIREWALL_USERNAME, then the login name. */
  username?: string
}

export type DevServer = {
  url: string
  /** Name shown in the dashboard's server selector. */
  label?: string
  description?: string
  firewall?: Firewall
  /** SimDB server-side authentication (dashboard login dialog). */
  requiresAuth?: boolean
  /** Set to false to hide the server from the dashboard. */
  enabled?: boolean
}

type DevServersFile = {
  default?: string
  servers?: Record<string, Partial<DevServer>>
}

export type ResolvedDevServers = {
  servers: Record<string, DevServer>
  defaultName: string
}

const PROXY_PREFIX = '/simdb'
const CONFIG_FILE = 'dev-servers.json'
const LOCAL_CONFIG_FILE = 'dev-servers.local.json'
const TOKEN_PARAM = 'simdb_dev_token'

/** SIMDB_DEV_FIREWALL_<name>, or the older SIMDB_DEV_F5_<name>. */
function firewallEnv(name: 'USERNAME' | 'PASSWORD'): string | undefined {
  return process.env[`SIMDB_DEV_FIREWALL_${name}`] || process.env[`SIMDB_DEV_F5_${name}`]
}

function readJson(path: string): DevServersFile | null {
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as DevServersFile
  } catch (err) {
    throw new Error(`Cannot parse ${path}: ${(err as Error).message}`)
  }
}

export function loadDevServers(root: string): ResolvedDevServers {
  const base = readJson(resolve(root, CONFIG_FILE)) ?? {}
  const local = readJson(resolve(root, LOCAL_CONFIG_FILE)) ?? {}

  // Local entries override base entries field by field, or add new servers.
  const merged: Record<string, Partial<DevServer>> = { ...base.servers }
  for (const [name, server] of Object.entries(local.servers ?? {})) {
    merged[name] = { ...merged[name], ...server }
  }

  let defaultName = local.default ?? base.default

  // SIMDB_DEV_SERVER=<name> picks a configured server, =<URL> adds one.
  const fromEnv = process.env.SIMDB_DEV_SERVER?.trim()
  if (fromEnv) {
    if (fromEnv.includes('://')) {
      merged.custom = { url: fromEnv, label: fromEnv, description: 'From SIMDB_DEV_SERVER', enabled: true }
      defaultName = 'custom'
    } else {
      defaultName = fromEnv
      // Selecting a server explicitly enables it.
      if (merged[fromEnv]) merged[fromEnv] = { ...merged[fromEnv], enabled: true }
    }
  }

  const servers: Record<string, DevServer> = {}
  for (const [name, server] of Object.entries(merged)) {
    if (server.enabled === false) continue
    if (!/^[A-Za-z0-9._-]+$/.test(name)) {
      throw new Error(`Invalid dev server name "${name}": use letters, digits, ".", "_" or "-".`)
    }
    if (typeof server.url !== 'string' || !/^https?:\/\//.test(server.url)) {
      throw new Error(`Dev server "${name}" needs an http(s) "url".`)
    }
    const fw = server.firewall
    if (fw !== undefined && (typeof fw !== 'object' || fw === null || fw.type !== 'basic')) {
      throw new Error(`Dev server "${name}": "firewall" must be {"type": "basic", ...}.`)
    }
    servers[name] = { ...server, url: server.url.replace(/\/+$/, '') } as DevServer
  }

  const names = Object.keys(servers)
  if (names.length === 0) {
    throw new Error(`No enabled SimDB servers in ${CONFIG_FILE} / ${LOCAL_CONFIG_FILE}.`)
  }
  if (!defaultName) defaultName = names[0]
  if (!servers[defaultName]) {
    throw new Error(
      `Default SimDB dev server "${defaultName}" is not configured or not enabled. ` +
        `Available: ${names.join(', ')}.`
    )
  }
  return { servers, defaultName }
}

export function proxyPath(name: string): string {
  return `${PROXY_PREFIX}/${name}`
}

export function runtimeConfigScript({ servers, defaultName }: ResolvedDevServers): string {
  const names = Object.keys(servers)
  // Default server first, so it is also first in the server selector.
  names.sort((a, b) => Number(b === defaultName) - Number(a === defaultName))
  const config = {
    servers: names.map(proxyPath),
    defaultServer: proxyPath(defaultName),
    serverConfig: Object.fromEntries(
      names.map((name) => [
        proxyPath(name),
        { requiresAuth: servers[name].requiresAuth ?? false, label: servers[name].label ?? name }
      ])
    )
  }
  return (
    '// Generated by dev/simdbDevServers.ts from dev-servers.json (Vite dev server only).\n' +
    `window.__SIMDB_RUNTIME_CONFIG__ = ${JSON.stringify(config, null, 2)};\n`
  )
}

// --- Firewall session handling ---------------------------------------------

function setCookies(headers: Headers): string[] {
  const h = headers as Headers & { getSetCookie?: () => string[] }
  if (typeof h.getSetCookie === 'function') return h.getSetCookie()
  const single = headers.get('set-cookie')
  return single ? [single] : []
}

/**
 * HTTP Basic login at the firewall: request the server URL with Basic auth
 * (and the configured User-Agent) and keep the session cookies it sets.
 * ITER F5 example: User-Agent "it_script_basic" selects F5 "Clientless
 * Authentication" (a 401 Basic challenge on the URL itself).
 * Returns a Cookie header, or null if no cookie was set (then Basic auth is
 * sent on every request).
 */
async function firewallLogin(
  loginUrl: string,
  username: string,
  password: string,
  userAgent?: string
): Promise<string | null> {
  const origin = new URL(loginUrl).origin
  const jar = new Map<string, string>()
  const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ')
  const authorization = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')

  let url = loginUrl
  for (let hop = 0; hop < 10; hop++) {
    const headers: Record<string, string> = {}
    if (userAgent) headers['User-Agent'] = userAgent
    if (new URL(url).origin === origin) headers.Authorization = authorization
    if (jar.size) headers.Cookie = cookieHeader()

    let resp: Response
    try {
      resp = await fetch(url, { headers, redirect: 'manual' })
    } catch (err) {
      const cause = (err as Error & { cause?: Error }).cause
      throw new Error(`Cannot reach firewall login at ${url}: ${cause?.message ?? (err as Error).message}`)
    }
    for (const cookie of setCookies(resp.headers)) {
      const pair = cookie.split(';', 1)[0]
      const eq = pair.indexOf('=')
      if (eq <= 0) continue
      const key = pair.slice(0, eq).trim()
      const value = pair.slice(eq + 1).trim()
      const expires = /;\s*expires=([^;]+)/i.exec(cookie)?.[1]
      const expired = expires !== undefined && Date.parse(expires) < Date.now()
      if (value === '' || value === 'deleted' || expired) jar.delete(key)
      else jar.set(key, value)
    }

    const location = resp.headers.get('location')
    if (resp.status >= 300 && resp.status < 400 && location) {
      // F5 sends failed logins to /my.logout.php3?errorcode=...
      if (/logout|errorcode=/i.test(location)) {
        throw new Error(`Firewall rejected the login for user "${username}" (redirected to ${location}).`)
      }
      url = new URL(location, url).toString()
      continue
    }
    if (resp.status === 401) {
      throw new Error(`Firewall rejected the credentials for user "${username}" (HTTP 401).`)
    }
    if (!resp.ok) throw new Error(`Firewall login failed: HTTP ${resp.status} ${resp.statusText}`)
    return jar.size ? cookieHeader() : null
  }
  throw new Error(`Firewall login: too many redirects from ${loginUrl}`)
}

type FirewallHeaders = { cookie: string } | { authorization: string }

class FirewallSession {
  private headers: FirewallHeaders | null = null
  private pending: Promise<FirewallHeaders> | null = null

  constructor(
    readonly name: string,
    private readonly loginUrl: string,
    private readonly username: string,
    readonly userAgent?: string
  ) {}

  /** Headers to add to proxied requests (session cookie, or Basic auth). */
  async getHeaders(): Promise<FirewallHeaders> {
    if (this.headers) return this.headers
    const password = firewallEnv('PASSWORD')
    if (!password) {
      throw new Error(
        `Server "${this.name}" is behind a firewall: set SIMDB_DEV_FIREWALL_PASSWORD ` +
          `(and SIMDB_DEV_FIREWALL_USERNAME if not "${this.username}") before starting the dev server.`
      )
    }
    if (!this.pending) {
      this.pending = firewallLogin(this.loginUrl, this.username, password, this.userAgent)
        .then((cookie) => {
          this.headers = cookie
            ? { cookie }
            : { authorization: 'Basic ' + Buffer.from(`${this.username}:${password}`).toString('base64') }
          console.info(`[simdb-dev] Firewall login to ${this.name} as ${this.username}: OK`)
          return this.headers
        })
        .finally(() => {
          this.pending = null
        })
    }
    return this.pending
  }

  invalidate(): void {
    if (this.headers) console.info(`[simdb-dev] Firewall session for ${this.name} expired, will log in again`)
    this.headers = null
  }
}

function sendJsonError(res: ServerResponse, status: number, message: string): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  // Same shape as SimDB server errors, so the dashboard shows the message.
  res.end(JSON.stringify({ error: message }))
}

function hasToken(req: IncomingMessage, token: string): boolean {
  const cookies = req.headers.cookie ?? ''
  return cookies.split(';').some((c) => c.trim() === `${TOKEN_PARAM}=${token}`)
}

function stripTokenCookie(req: IncomingMessage): void {
  if (!req.headers.cookie) return
  const kept = req.headers.cookie
    .split(';')
    .map((c) => c.trim())
    .filter((c) => c && !c.startsWith(`${TOKEN_PARAM}=`))
  if (kept.length) req.headers.cookie = kept.join('; ')
  else delete req.headers.cookie
}

// --- Vite plugin -----------------------------------------------------------

type DevState = {
  resolved: ResolvedDevServers
  token: string
  sessions: Map<string, FirewallSession>
}

function createState(root: string): DevState {
  const resolved = loadDevServers(root)
  const sessions = new Map<string, FirewallSession>()
  for (const [name, server] of Object.entries(resolved.servers)) {
    const fw = server.firewall
    if (fw) {
      const username = firewallEnv('USERNAME') || fw.username || process.env.USER || userInfo().username
      sessions.set(name, new FirewallSession(name, `${server.url}/`, username, fw.userAgent))
    }
  }
  // Kept in the process environment so it survives Vite restarts (config or
  // plugin changes): the browser cookie stays valid until the process exits.
  process.env.SIMDB_DEV_TOKEN ||= randomBytes(16).toString('hex')
  return { resolved, token: process.env.SIMDB_DEV_TOKEN, sessions }
}

function createProxy({ resolved, sessions }: DevState): Record<string, ProxyOptions> {
  const proxy: Record<string, ProxyOptions> = {}
  for (const [name, server] of Object.entries(resolved.servers)) {
    const prefix = proxyPath(name)
    const session = sessions.get(name)
    proxy[`^${prefix}(/|$)`] = {
      target: server.url,
      changeOrigin: true,
      rewrite: (path) => path.slice(prefix.length),
      configure: (proxyServer) => {
        proxyServer.on('error', (err, _req, res) => {
          if ('setHeader' in res && !res.headersSent) {
            sendJsonError(res, 502, `Cannot reach SimDB server "${name}" (${server.url}): ${err.message}`)
          }
        })
        if (!session) return
        proxyServer.on('proxyRes', (proxyRes) => {
          // 401, or a redirect to a login page: the session has expired.
          const location = String(proxyRes.headers.location ?? '')
          if (proxyRes.statusCode === 401 || /login|logon|logout|policy|auth/i.test(location)) {
            session.invalidate()
          }
          // Firewall cookies belong to the server-side session, not to the browser.
          delete proxyRes.headers['set-cookie']
        })
      }
    }
  }
  return proxy
}

export function simdbDevServers(root: string): Plugin {
  // Created in config(), which only runs for the dev server (apply: 'serve'),
  // so `vite build` and vitest never read dev-servers*.json.
  let state: DevState

  return {
    name: 'simdb-dev-servers',
    apply: 'serve',

    config() {
      state = createState(root)
      return { server: { proxy: createProxy(state) } }
    },

    configureServer(server) {
      const { resolved, token, sessions } = state
      // Added directly (not returned), so it runs before Vite's own middlewares,
      // including the proxy and the public/ static files.
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')

        if (url.pathname === '/runtime-config.js' || url.pathname === '/dashboard/runtime-config.js') {
          res.setHeader('Content-Type', 'application/javascript')
          res.setHeader('Cache-Control', 'no-store')
          res.end(runtimeConfigScript(resolved))
          return
        }

        // Store the token as a cookie, then redirect without it: the dashboard
        // would otherwise treat the query parameter as a search filter.
        if (url.searchParams.has(TOKEN_PARAM)) {
          if (url.searchParams.get(TOKEN_PARAM) === token) {
            res.setHeader('Set-Cookie', `${TOKEN_PARAM}=${token}; Path=/; HttpOnly; SameSite=Strict`)
          }
          url.searchParams.delete(TOKEN_PARAM)
          res.statusCode = 302
          res.setHeader('Location', url.pathname + url.search)
          res.end()
          return
        }

        const match = /^\/simdb\/([^/]+)(\/|$)/.exec(url.pathname)
        if (!match) return next()
        const session = sessions.get(match[1])
        const tokenOk = hasToken(req, token)
        // Never forward the dev token cookie to SimDB servers.
        stripTokenCookie(req)
        if (!session) return next()

        if (!tokenOk) {
          return sendJsonError(
            res,
            403,
            `Server "${session.name}" is behind a firewall: open the dashboard with the ` +
              `?${TOKEN_PARAM}=... URL printed by the dev server.`
          )
        }
        try {
          Object.assign(req.headers, await session.getHeaders())
          if (session.userAgent) req.headers['user-agent'] = session.userAgent
          next()
        } catch (err) {
          sendJsonError(res, 502, (err as Error).message)
        }
      })

      const printUrls = server.printUrls.bind(server)
      server.printUrls = () => {
        printUrls()
        const info = server.config.logger.info
        info('\n  SimDB dev servers (dev-servers.json, dev-servers.local.json, SIMDB_DEV_SERVER):')
        for (const [name, s] of Object.entries(resolved.servers)) {
          const mark = name === resolved.defaultName ? '*' : ' '
          const fw = s.firewall ? '  [firewall]' : ''
          info(`  ${mark} ${proxyPath(name).padEnd(20)} -> ${s.url}${fw}`)
        }
        if (sessions.size > 0) {
          const { port } = server.config.server
          const local = (
            server.resolvedUrls?.local[0] ?? `http://localhost:${port}${server.config.base}`
          ).replace(/\/?$/, '/')
          const pwNote = firewallEnv('PASSWORD') ? '' : ' (SIMDB_DEV_FIREWALL_PASSWORD not set)'
          info(`\n  For firewall servers${pwNote}, open: ${local}?${TOKEN_PARAM}=${token}\n`)
        }
      }
    }
  }
}
