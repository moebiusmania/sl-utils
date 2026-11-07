# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
bun install
bun run dev         # Vite dev server with SSR, listens on all interfaces (--host)
bun run dev:local   # same, localhost only
bun run check       # tsc --noEmit — the only static check; there is no linter or test suite
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
- **`server/*.ts`** hold the API logic as plain functions that take parsed
  query values and return a Web `Response` — no Hono types, so they're easy to
  call directly. Add a route in `+server.ts` to wire a new one.
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

`server/meta.ts` (`/api/meta`) fetches arbitrary user-supplied URLs, so it is
an SSRF surface. It resolves each hostname and rejects any non-public address
(`isBlockedAddress`), and follows redirects manually so every hop is
re-validated. Keep `redirect: "manual"` and the per-hop `assertPublicTarget`
call if you touch the fetch logic.

## Deployment

- `Dockerfile`: multi-stage build; the server is bundled into a single
  `dist/server/index.bundle.mjs` so the distroless runtime image has no
  `node_modules`. Base images are pinned by digest (update the digest together
  with `BUN_VERSION`). App files stay root-owned; the process runs as 65532.
- `compose.yaml`: read-only rootfs, all caps dropped, resource limits,
  published on `127.0.0.1:3200` by default (`SL_UTILS_BIND`, `SL_UTILS_PORT`,
  `SL_UTILS_SUBNET`). It is intended to sit behind a reverse proxy on
  localhost.
- `scripts/docker-egress-lockdown.sh` + `scripts/sl-utils-egress.service`:
  host iptables rules limiting the container to DNS (default
  `SL_UTILS_DNS=100.100.100.100`, Tailscale MagicDNS) and public TCP 80/443.
  Installed on the host as `/usr/local/sbin/sl-utils-egress-lockdown` and a
  systemd unit tied to `docker.service`; after editing the script, re-`install`
  it there and `systemctl restart sl-utils-egress`.
