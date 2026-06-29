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

// Skip the copy when assets are already committed to web/public/assets/
// (web-only repo). Use the copy when running from the monorepo where assets
// live alongside the desktop app source.
const needsCopy = !existsSync(resolve(__dirname, 'public/assets/Monsters'))

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
