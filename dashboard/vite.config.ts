import { fileURLToPath, URL } from 'node:url'
import { execSync } from 'child_process'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import viteCompression from 'vite-plugin-compression'

// Import config for IBEX backend settings
const config = {
  ibexBackend: {
    host: 'localhost',
    port: 6060,
    protocol: 'http'
  }
}

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
    console.warn('⚠️  Could not get version from git, using fallback')
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
  ],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    proxy: {
      '/api/ibex': {
        target: `${config.ibexBackend.protocol}://${config.ibexBackend.host}:${config.ibexBackend.port}`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ibex/, '')
      }
    }
  },
  base: '/dashboard',
  build: {
    target: 'es2015',
  }
})
