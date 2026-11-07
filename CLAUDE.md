# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rule: OWASP compliance

Every change or addition to this project must be OWASP compliant: check new
and modified code against the OWASP Top 10 and the relevant OWASP Cheat Sheets
(and ASVS for anything security-critical) before considering it done. In
practice this means, at minimum:

- validate and bound every input (type, range, length) and return 4xx, not 5xx;
- no new DoS vectors: cap sizes, counts, timeouts and concurrency;
- use Web Crypto (`crypto.getRandomValues`, `crypto.subtle`) for anything
  security-related, never `Math.random`, and follow current OWASP parameters;
- keep the strict CSP working: no inline scripts/styles, no `eval`, no
  `dangerouslySetInnerHTML`; widen a directive only with a written reason;
- any server-side fetch of user-controlled URLs must go through the SSRF
  checks in `server/meta.ts`;
- don't leak internals: generic error responses, structured server-side logs
  with no secrets or user data;
- prefer doing sensitive work client-side so secrets never reach the server;
- keep dependencies audited (`bun audit`) and base images pinned by digest.

If a change cannot meet a requirement, say so explicitly instead of shipping it
silently.

## Commands

```sh
bun install
bun run dev         # Vite dev server with SSR, listens on all interfaces (--host)
bun run dev:local   # same, localhost only
bun run check       # tsc --noEmit — the only static check; there is no linter or test suite
bun audit           # dependency vulnerability check
bun run build       # vike build -> dist/client + dist/server/index.mjs
bun run start       # run the production build
docker compose up -d --build   # build and (re)deploy the hardened container
```

No test runner is configured. To exercise server code ad hoc, run a script with
`bun` that imports the handler (e.g. `handleMetaRequest` from `server/meta.ts`)
and inspects the returned `Response`.

## Architecture

Bun + Hono server, Vike (Vite SSR) + Preact UI. A small set of personal utility
pages, each backed by an optional JSON/text API.

- **`+server.ts`** is the server entry (Vike's `+server` convention). It mounts
  Vike's middleware on a Hono app *first* (so page routes render through Vike),
  then registers `/api/*` routes. Port comes from `PORT` (default 3000).
- **`+server.ts`** also registers Hono `secureHeaders` *before* Vike, so pages
  get the headers too. The CSP (`script-src 'self'`, `style-src 'self'`, etc.)
  is applied only when `import.meta.env.PROD`, because Vite dev needs inline
  scripts. `app.onError` logs JSON and returns a generic 500.
- **`server/*.ts`** hold the API logic as plain functions that take parsed
  query values and return a Web `Response` — no Hono types, so they're easy to
  call directly. Add a route in `+server.ts` to wire a new one.
- **`lib/*.ts`** is isomorphic code shared by the browser and the server (e.g.
  `lib/password.ts`: the `/password` page generates locally, and
  `/api/password` uses the same function).
- **`pages/<route>/`** uses Vike filesystem routing: `+Page.tsx` renders the
  page (typically `PageLayout` wrapping a component from `components/`), and
  `+config.ts` sets `title`/`description`, which are custom meta declared in
  `renderer/+config.ts` and read by `renderer/getPageTitle.ts`.
- **`renderer/`** contains the custom Vike renderer: `+onRenderHtml.tsx` (SSR
  document shell) and `+onRenderClient.tsx` (hydration). `clientRouting` is
  `false`, so every navigation is a full page load that hydrates on the client.
- **Theming:** `public/theme.js` is a blocking `<head>` script that applies the
  `dark` class before first paint; it must stay in sync with
  `components/ThemeToggle.tsx` (same `sl-utils-theme` localStorage key).
  Styles are plain CSS with design tokens in `assets/styles.css`.
- Imports use explicit `.ts`/`.tsx` extensions (`allowImportingTsExtensions`).

## Security-sensitive code

- `server/meta.ts` (`/api/meta`) fetches arbitrary user-supplied URLs, so it is
  an SSRF surface. It resolves each hostname and rejects any non-public address
  (`isBlockedAddress`), and follows redirects manually so every hop is
  re-validated. Keep `redirect: "manual"` and the per-hop `assertPublicTarget`
  call if you touch the fetch logic. Concurrent fetches are capped
  (`MAX_CONCURRENT_FETCHES`, 503 when full).
- `components/SocialPreview.tsx` doesn't load third-party images until the user
  opts in, so the previewed site doesn't see visitors' IPs by default.
- `components/Aes256Cipher.tsx` writes `v2.salt.iv.ciphertext` (PBKDF2-SHA256,
  600k iterations, AES-256-GCM). Unprefixed `salt.iv.ciphertext` is the legacy
  150k format and must stay decryptable; bump the version prefix for any
  future parameter change.

## Deployment

- `Dockerfile`: multi-stage build; the server is bundled into a single
  `dist/server/index.bundle.mjs` so the distroless runtime image has no
  `node_modules`. `bun build` needs `--define process.env.NODE_ENV="production"`,
  otherwise it inlines `"development"` into the bundle. Base images are pinned by digest (update the digest together
  with `BUN_VERSION`). App files stay root-owned; the process runs as 65532.
- `compose.yaml`: read-only rootfs, all caps dropped, resource limits,
  published on `127.0.0.1:3200` by default (`SL_UTILS_BIND`, `SL_UTILS_PORT`,
  `SL_UTILS_SUBNET`). Host-specific values go in the git-ignored `.env`. If the
  reverse proxy runs on another machine (e.g. over a VPN), it cannot reach
  127.0.0.1: bind to the host's VPN IP instead (with
  `net.ipv4.ip_nonlocal_bind=1` for boot ordering). Always check the app is
  still reachable through the proxy after changing the bind.
- `scripts/docker-egress-lockdown.sh` + `scripts/sl-utils-egress.service`:
  host iptables rules limiting the container to DNS (the host's resolvers from
  `resolv.conf`, or `SL_UTILS_DNS`) and public TCP 80/443.
  Installed on the host as `/usr/local/sbin/sl-utils-egress-lockdown` and a
  systemd unit tied to `docker.service`; after editing the script, re-`install`
  it there and `systemctl restart sl-utils-egress`.
