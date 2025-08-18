import { defineConfig } from 'vite'

// Minimal valid Vite config to resolve "config must export or return an object" error
export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5173
  }
})