/**
 * Dev-only SimDB server setup for the Vite dev server (`npm run dev`, `make dev`).
 *
 * - Reads dev-servers.json, merged with the gitignored dev-servers.local.json.
 * - Proxies each server at /simdb/<name>, so the browser only talks to the dev
 *   server and the SimDB servers do not need CORS headers.
 * - Serves a generated runtime-config.js listing these servers, instead of
 *   public/runtime-config.js (which targets the nginx proxy in production).
 * - For servers with "firewall": "F5", logs in to F5 server-side the way
 *   F5 clientless mode expects (Basic auth with User-Agent "it_script_basic"),
 *   and adds the session cookie to proxied requests. The password is taken
 *   from SIMDB_DEV_F5_PASSWORD only, never from a file.
 *
 * Because other users of a shared host can reach localhost too, F5-backed routes
 * require a random per-run token, given in the URL printed at startup.
 *
 * Not used by `vite build`: production behaviour is unchanged.
 */
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { userInfo } from 'node:os'
import { resolve } from 'node:path'
import type { Plugin, ProxyOptions } from 'vite'

export type DevServer = {
  url: string
  /** Name shown in the dashboard's server selector. */
  label?: string
  description?: string
  /** Only "F5" is supported. */
  firewall?: 'F5'
  /** F5 username; defaults to SIMDB_DEV_F5_USERNAME, then the login name. */
  username?: string
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
const F5_USER_AGENT = 'it_script_basic'

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
    if (server.firewall !== undefined && server.firewall !== 'F5') {
      throw new Error(`Dev server "${name}": unknown firewall "${server.firewall}" (only "F5").`)
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

// --- F5 session handling ---------------------------------------------------

function setCookies(headers: Headers): string[] {
  const h = headers as Headers & { getSetCookie?: () => string[] }
  if (typeof h.getSetCookie === 'function') return h.getSetCookie()
  const single = headers.get('set-cookie')
  return single ? [single] : []
}

/**
 * Log in to F5 with "Clientless Authentication": with User-Agent it_script_basic,
 * F5 answers 401 + Basic challenge on the protected URL itself (a POST to
 * /my.policy without an existing session is rejected with errorcode=19).
 * Returns the session as a Cookie header, or null if F5 set no cookie (then
 * Basic auth is sent on every request).
 */
async function f5Login(loginUrl: string, username: string, password: string): Promise<string | null> {
  const origin = new URL(loginUrl).origin
  const jar = new Map<string, string>()
  const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ')
  const authorization = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')

  let url = loginUrl
  for (let hop = 0; hop < 10; hop++) {
    const headers: Record<string, string> = { 'User-Agent': F5_USER_AGENT }
    if (new URL(url).origin === origin) headers.Authorization = authorization
    if (jar.size) headers.Cookie = cookieHeader()

    let resp: Response
    try {
      resp = await fetch(url, { headers, redirect: 'manual' })
    } catch (err) {
      const cause = (err as Error & { cause?: Error }).cause
      throw new Error(`Cannot reach F5 login at ${url}: ${cause?.message ?? (err as Error).message}`)
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
      if (/my\.logout|errorcode=/i.test(location)) {
        throw new Error(`F5 rejected the login for user "${username}" (redirected to ${location}).`)
      }
      url = new URL(location, url).toString()
      continue
    }
    if (resp.status === 401) {
      throw new Error(`F5 rejected the credentials for user "${username}" (HTTP 401).`)
    }
    if (!resp.ok) throw new Error(`F5 login failed: HTTP ${resp.status} ${resp.statusText}`)
    return jar.size ? cookieHeader() : null
  }
  throw new Error(`F5 login: too many redirects from ${loginUrl}`)
}

type F5Headers = { cookie: string } | { authorization: string }

class F5Session {
  private headers: F5Headers | null = null
  private pending: Promise<F5Headers> | null = null

  constructor(
    readonly name: string,
    private readonly loginUrl: string,
    private readonly username: string
  ) {}

  /** Headers to add to proxied requests (session cookie, or Basic auth). */
  async getHeaders(): Promise<F5Headers> {
    if (this.headers) return this.headers
    const password = process.env.SIMDB_DEV_F5_PASSWORD
    if (!password) {
      throw new Error(
        `Server "${this.name}" is behind F5: set SIMDB_DEV_F5_PASSWORD ` +
          `(and SIMDB_DEV_F5_USERNAME if not "${this.username}") before starting the dev server.`
      )
    }
    if (!this.pending) {
      this.pending = f5Login(this.loginUrl, this.username, password)
        .then((cookie) => {
          this.headers = cookie
            ? { cookie }
            : { authorization: 'Basic ' + Buffer.from(`${this.username}:${password}`).toString('base64') }
          console.info(`[simdb-dev] F5 login to ${this.name} as ${this.username}: OK`)
          return this.headers
        })
        .finally(() => {
          this.pending = null
        })
    }
    return this.pending
  }

  invalidate(): void {
    if (this.headers) console.info(`[simdb-dev] F5 session for ${this.name} expired, will log in again`)
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
  f5Sessions: Map<string, F5Session>
}

function createState(root: string): DevState {
  const resolved = loadDevServers(root)
  const f5Sessions = new Map<string, F5Session>()
  for (const [name, server] of Object.entries(resolved.servers)) {
    if (server.firewall === 'F5') {
      const username =
        process.env.SIMDB_DEV_F5_USERNAME || server.username || process.env.USER || userInfo().username
      f5Sessions.set(name, new F5Session(name, `${server.url}/`, username))
    }
  }
  // Kept in the process environment so it survives Vite restarts (config or
  // plugin changes): the browser cookie stays valid until the process exits.
  process.env.SIMDB_DEV_TOKEN ||= randomBytes(16).toString('hex')
  return { resolved, token: process.env.SIMDB_DEV_TOKEN, f5Sessions }
}

function createProxy({ resolved, f5Sessions }: DevState): Record<string, ProxyOptions> {
  const proxy: Record<string, ProxyOptions> = {}
  for (const [name, server] of Object.entries(resolved.servers)) {
    const prefix = proxyPath(name)
    const session = f5Sessions.get(name)
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
          const location = String(proxyRes.headers.location ?? '')
          if (proxyRes.statusCode === 401 || /my\.policy|my\.logout/i.test(location)) {
            session.invalidate()
          }
          // F5 cookies belong to the server-side session, not to the browser.
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
      const { resolved, token, f5Sessions } = state
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
        const session = f5Sessions.get(match[1])
        const tokenOk = hasToken(req, token)
        // Never forward the dev token cookie to SimDB servers.
        stripTokenCookie(req)
        if (!session) return next()

        if (!tokenOk) {
          return sendJsonError(
            res,
            403,
            `Server "${session.name}" is behind F5: open the dashboard with the ` +
              `?${TOKEN_PARAM}=... URL printed by the dev server.`
          )
        }
        try {
          Object.assign(req.headers, await session.getHeaders())
          req.headers['user-agent'] = F5_USER_AGENT
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
          const f5 = s.firewall === 'F5' ? '  [F5]' : ''
          info(`  ${mark} ${proxyPath(name).padEnd(20)} -> ${s.url}${f5}`)
        }
        if (f5Sessions.size > 0) {
          const { port } = server.config.server
          const local = (
            server.resolvedUrls?.local[0] ?? `http://localhost:${port}${server.config.base}`
          ).replace(/\/?$/, '/')
          const pwNote = process.env.SIMDB_DEV_F5_PASSWORD ? '' : ' (SIMDB_DEV_F5_PASSWORD not set)'
          info(`\n  For F5 servers${pwNote}, open: ${local}?${TOKEN_PARAM}=${token}\n`)
        }
      }
    }
  }
}
