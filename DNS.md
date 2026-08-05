# DNS — Cloudflare → GitHub Pages + Workers

Registrar: Namecheap. Authoritative DNS: Cloudflare zone `alaning.me`
(nameservers `ligia.ns.cloudflare.com`, `margo.ns.cloudflare.com`).

Traffic is orange-cloud proxied. Public A/AAAA answers are Cloudflare anycast,
not the origin IPs.

| Layer | Host | Role |
|-------|------|------|
| Static site | `alaning.me` / `www` | Origin: GitHub Pages (`alaning0.github.io`); repo `CNAME` = `alaning.me` |
| API | `alaning.me/api*` (and `www`) | Workers route → `alaning-me-api` (also on `*.workers.dev`) |

## Origin records (Cloudflare dashboard)

Keep apex + www pointing at GitHub Pages behind the proxy (exact record
shapes as configured in the zone — typically GitHub Pages A records and/or
`www` → `alaning0.github.io`). Do not point public DNS at the old unproxied
GitHub A list as if Cloudflare were not in the path.

## Workers routes

Configured in `worker/wrangler.jsonc`:

- `alaning.me/api*`
- `www.alaning.me/api*`

Non-`/api*` paths fall through to the GitHub Pages origin.
