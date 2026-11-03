import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { spawn } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    socket.setTimeout(400)
    socket.on('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.on('timeout', () => {
      socket.destroy()
      resolve(false)
    })
    socket.on('error', () => {
      resolve(false)
    })
    socket.connect(port, '127.0.0.1')
  })
}

function autoBackendPlugin() {
  let backendProc = null
  return {
    name: 'auto-backend-starter',
    async configureServer(server) {
      const isRunning = await isPortOpen(5000)
      if (!isRunning) {
        console.log('\x1b[36m%s\x1b[0m', '⚡ Auto-starting backend API server on port 5000...')
        const backendDir = path.resolve(__dirname, '../backend')
        backendProc = spawn(process.execPath, ['index.js'], {
          cwd: backendDir,
          stdio: 'inherit',
          env: { ...process.env, PORT: '5000' },
        })

        const cleanup = () => {
          if (backendProc) {
            backendProc.kill()
            backendProc = null
          }
        }

        process.on('exit', cleanup)
        process.on('SIGINT', cleanup)
        process.on('SIGTERM', cleanup)

        server.httpServer?.on('close', cleanup)
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), autoBackendPlugin()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
