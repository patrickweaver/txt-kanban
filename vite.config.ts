import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Emit asset URLs relative to index.html rather than the server root, so a
  // build can be dropped into a subdirectory of another site (e.g. an Eleventy
  // site serving it at /cranban/) without baking that path in. With the
  // default "/" base the bundle only works when served from the domain root.
  base: "./",
})
