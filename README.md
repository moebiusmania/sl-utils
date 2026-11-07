# sl-utils

> 🛠️ A collection of small utilities for myself 🤓

https://sl-utils.moebiusmania.deno.net/

Some simple and small APIs (_with some companion UIs_) to make my life easier.

## Pages

- `/password` - Generate secure passwords with customizable options
- `/qr-code` - Generate QR codes for a given URL
- `/timer` - A simple countdown timer with minutes and seconds
- `/notes` - Full-page editable notes saved in your browser
- `/aes-256` - Encrypt/decrypt text with AES-256 in your browser
- `/social-preview` - Preview how a link looks when shared on social networks
  (Google, X/Twitter, Facebook, LinkedIn, Slack, Discord)

## APIs

- `GET /api/password` - Generate a random password
- `GET /api/qr-code?url=<url>` - Create a QR code for a given URL
- `GET /api/mit-license` - Precompiled MIT License text
- `GET /api/meta?url=<url>` - Extract the sharing metadata of a given URL

## Tech stack

Built on top of:

- [Bun](https://bun.sh/) - JavaScript runtime and package manager
- [Vike](https://vike.dev/) - Vite-based SSR framework
- [Vite](https://vite.dev/) - Frontend build tool
- [Preact](https://preactjs.com/) - Fast 3kB alternative to React

and some modules:

- [uqr](https://github.com/unjs/uqr)

## How to use

Make sure to install Bun on your machine:
https://bun.sh/docs/installation

Then, clone the repository:

```
$ git clone https://github.com/salvatorelaisa/sl-utils.git
$ cd sl-utils
```

Install dependencies and start the project:

```
$ bun install
$ bun run dev
```

The dev server listens on all interfaces so you can test it from another device
on the same network. To bind to localhost only:

```
$ bun run dev:local
```

For production build and run:

```
$ bun run build
$ bun run start
```

The production build is a standard Bun server in `dist/`, so it can be hosted on
any platform that runs Bun (or Node.js).

## Docker

Build and run with Docker Compose:

```
$ docker compose up -d --build
```

The app listens on port `3000` inside the container and is published on port
`3200`:

- `http://localhost:3200`
- `http://<host-ip>:3200` from another device on the LAN

Useful commands:

```
$ docker compose logs -f
$ docker compose down
```

The runtime image is distroless: it has no shell and no package manager. The
server is bundled into a single file, so the image does not include
`node_modules`. The container runs as a non-root user on a read-only root
filesystem, with all Linux capabilities dropped and resource limits applied.

### Configuration

| Variable          | Default         | Description                          |
| ----------------- | --------------- | ------------------------------------ |
| `SL_UTILS_BIND`   | `0.0.0.0`       | Host address to bind the published port to |
| `SL_UTILS_PORT`   | `3200`          | Host port                            |
| `SL_UTILS_SUBNET` | `172.28.0.0/24` | Docker network subnet                |

For example, to listen only on localhost:

```
$ SL_UTILS_BIND=127.0.0.1 docker compose up -d
```

### Egress lockdown

Docker's default bridge network lets the container reach the host and other
devices on your LAN. To restrict egress to public HTTP/HTTPS only:

```
$ sudo ./scripts/docker-egress-lockdown.sh
```

Remove the rules with:

```
$ sudo ./scripts/docker-egress-lockdown.sh --remove
```

The script allows DNS and outbound TCP `80`/`443`, and drops traffic to the
Compose subnet, private ranges, link-local addresses, CGNAT ranges, and new
connections to host services. Use the same `SL_UTILS_SUBNET` value when removing
the rules, and re-run the script after a Docker daemon restart or if the subnet
changes. IPv6 is not covered; the Compose network keeps IPv6 disabled.

Outbound HTTP/HTTPS and DNS are still allowed so `/api/meta` works. For stricter
egress control, use an allowlisting proxy instead of direct internet access.

### Public exposure

The app has no authentication. If you expose it beyond your LAN, put it behind a
reverse proxy that provides TLS, rate limiting, and security headers, and avoid
publishing the container port directly to the internet.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file
for details.
