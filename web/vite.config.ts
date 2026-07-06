import { existsSync, copyFileSync } from 'fs'
import { resolve } from 'path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Emit dist/404.html as a copy of dist/index.html so GitHub Pages (and any
// static host without SPA rewrites) serves the app for deep links / refreshes
// on client-side routes like /monsters instead of a 404.
function spa404Fallback(): Plugin {
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    closeBundle() {
      const outDir = resolve(__dirname, 'dist')
      const index = resolve(outDir, 'index.html')
      if (existsSync(index)) copyFileSync(index, resolve(outDir, '404.html'))
    },
  }
}

// Game icons live in web/public/assets/ and are served/copied natively by Vite
// (dev + build). They are mirrored from the desktop app's
// src/MhfuLookup.App/Assets/ folders; re-run the mirror if those source icons
// change. (We used to pull them in via vite-plugin-static-copy, but that plugin
// is broken under Vite 8 — it silently produces an asset-less build — so
// public/assets/ is now the single source of truth.)

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    spa404Fallback(),
  ],
  base: process.env.VITE_BASE ?? '/',
})
