# alaning.me

Personal site for Alan Ing — quiet landing page plus an ideas notepad.

- **Frontend:** GitHub Pages (`alaning.me`), proxied via Cloudflare
- **API + DB:** Cloudflare Workers + D1 (`worker/`)
- **Shortcut ingest:** `POST https://alaning.me/api` with JSON `{ "url", "description" }` and `Authorization: Bearer <API_KEY>` (Worker secret; do not commit the key)

## Develop

```bash
cd worker
npm install
npm run db:migrate:local
npm run dev
```

Update `config.js` to point at your local Worker if needed. For local `POST /api`, set a secret with `echo 'dev-key' | npx wrangler secret put API_KEY --local` (or pass via `.dev.vars`).

## Deploy API

```bash
cd worker
npm run db:migrate:remote
printf '%s' '<your-api-key>' | npx wrangler secret put API_KEY
npm run deploy
```

Then set `window.ALANING_API` in `config.js` to the Worker URL (or use same-origin `https://alaning.me` once routes are live).
