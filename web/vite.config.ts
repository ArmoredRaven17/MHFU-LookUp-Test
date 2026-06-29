import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

const ASSET_DIRS = [
  'Armor', 'Awards', 'Decorations', 'Elements', 'Fonts',
  'Items', 'Locations', 'Materials', 'Misc', 'Monsters', 'Notes', 'WeaponTypes',
]

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: ASSET_DIRS.map(dir => ({
        src: `../src/MhfuLookup.App/Assets/${dir}`,
        dest: 'assets',
      })),
    }),
  ],
  base: process.env.VITE_BASE ?? '/',
})
