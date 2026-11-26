import { fileURLToPath, URL } from 'node:url'
import { execSync } from 'child_process'
import { readFileSync } from 'node:fs'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import viteCompression from 'vite-plugin-compression'
import { simdbDevServers } from './dev/simdbDevServers'

// Get version from git
function getVersionFromGit() {
  try {
    const version = execSync('git describe --tags --always', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim()

    console.log(`📦 Building SimDB Dashboard ${version}`)

    return version
  } catch (error) {
    console.warn('⚠️  Could not get version from git, trying .app-version')
    return getVersionFromFile()
  }
}

function getVersionFromFile() {
  try {
    const version = readFileSync('.app-version', { encoding: 'utf-8' }).trim()
    if (!version) {
      throw new Error('.app-version is empty')
    }

    console.log(`📦 Building SimDB Dashboard ${version} (from .app-version)`)
    return version
  } catch (error) {
    console.warn(`caught error ${error}`)
    console.warn('⚠️  Could not read .app-version, using fallback')
    return '0.0.0-unknown'
  }
}

const version = getVersionFromGit()

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      script: {
        defineModel: true,
      }
    }),
    vueJsx(),
    nodePolyfills({
      include: ['buffer', 'stream']
    }),
    viteCompression(),
    // Dev server only (apply: 'serve'): SimDB server list + proxy, see dev-servers.json.
    simdbDevServers(fileURLToPath(new URL('.', import.meta.url))),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  base: '/dashboard',
  build: {
    target: 'es2015',
  }
})
