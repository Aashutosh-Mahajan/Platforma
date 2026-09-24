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

          // NOTE: this used to rewrite '/zesty' -> '/zesty/'. Don't — there's
          // a literal static directory at zesty-app/zesty/ (an orphaned,
          // unrelated mini-site with its own index.html). The trailing
          // slash made Vite's static file server resolve directly to that
          // directory's index.html instead of falling through to the SPA
          // shell, so any direct navigation, refresh, or bookmark of
          // /zesty silently served a completely different, disconnected
          // page instead of the real React Router route. Client-side
          // <Link>/navigate() calls never hit this middleware at all,
          // which is why the bug only showed up on hard navigations.

          next()
        })
      },
    },
  ],
})
