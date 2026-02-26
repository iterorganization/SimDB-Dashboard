import { fileURLToPath, URL } from 'node:url'
import { execSync } from 'child_process'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import viteCompression from 'vite-plugin-compression'

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
  base: '/dashboard',
  build: {
    target: 'es2015',
  }
})
