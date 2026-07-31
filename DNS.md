# DNS — Namecheap → GitHub Pages

`alaning.me` is served by GitHub Pages. The ideas API lives on Cloudflare Workers (`alaning-me-api.alaning0.workers.dev`).

## Apex + www

| Type  | Host | Value            |
|-------|------|------------------|
| A     | `@`  | `185.199.108.153` |
| A     | `@`  | `185.199.109.153` |
| A     | `@`  | `185.199.110.153` |
| A     | `@`  | `185.199.111.153` |
| CNAME | `www`| `alaning0.github.io` |

Repo `CNAME` file contains `alaning.me`.
