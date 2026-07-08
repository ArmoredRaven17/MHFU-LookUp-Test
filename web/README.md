# MHFU LookUp — Web App

A static React 19 + TypeScript + Vite reference tool for **Monster Hunter Freedom Unite (MHP2G)** —
weapons, armor, monsters, quests, items, gathering data, and more. This is the primary front end for
the project (see the [repo root README](../README.md) for the full picture, including the companion
WinUI desktop app).

Full documentation — tech stack, the data pipeline, directory structure, feature highlights (Notes
export/import, Bookmarks, personalization), and how it's deployed — lives in
[`../docs/web-app.md`](../docs/web-app.md).

## Quick start

```bash
npm install
npm run dev       # http://localhost:5173, with HMR
npm run build     # tsc -b && vite build -> dist/
npm run preview   # serve the production build locally
npm run lint      # oxlint
```

No backend or database is involved — the app reads static JSON already committed under
`public/data/`, exported from the shared `mhfu.db` by [`../export_to_json.py`](../export_to_json.py).
Re-run that script (from the repo root) after regenerating `mhfu.db` to pick up data changes.

Deploys to GitHub Pages automatically on push to `master` via
[`../.github/workflows/deploy-web.yml`](../.github/workflows/deploy-web.yml).
