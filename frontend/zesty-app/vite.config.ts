import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'zesty-route-redirect',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/restaurants' || req.url === '/restaurants/' || req.url === '/zesty/restaurants' || req.url === '/zesty/restaurants/') {
            res.statusCode = 302
            res.setHeader('Location', '/zesty')
            res.end()
            return
          }

          if (req.url === '/zesty') {
            req.url = '/zesty/'
          }

          next()
        })
      },
    },
  ],
})
