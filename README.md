# alaning.me

Personal site for Alan Ing — quiet landing page plus an ideas notepad.

- **Frontend:** GitHub Pages (`alaning.me`)
- **API + DB:** Cloudflare Workers + D1 (`worker/`)

## Develop

```bash
cd worker
npm install
npm run db:migrate:local
npm run dev
```

Update `config.js` to point at your local Worker if needed.

## Deploy API

```bash
cd worker
npm run db:migrate:remote
npm run deploy
```

Then set `window.ALANING_API` in `config.js` to the Worker URL.
