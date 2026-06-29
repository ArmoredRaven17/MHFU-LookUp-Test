import { existsSync } from 'fs'
import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

const ASSET_DIRS = [
  'Armor', 'Awards', 'Decorations', 'Elements', 'Fonts',
  'Items', 'Locations', 'Materials', 'Misc', 'Monsters', 'Notes', 'WeaponTypes',
]

// In the monorepo (desktop + web), assets live alongside the desktop app.
// In the web-only repo, assets are pre-committed to web/public/assets/ and
// Vite serves them directly — no copy step needed.
const desktopAssets = resolve(__dirname, '../src/MhfuLookup.App/Assets')
const needsCopy = existsSync(desktopAssets)

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(needsCopy ? [viteStaticCopy({
      targets: ASSET_DIRS.map(dir => ({
        src: `../src/MhfuLookup.App/Assets/${dir}`,
        dest: 'assets',
      })),
    })] : []),
  ],
  base: process.env.VITE_BASE ?? '/',
})
