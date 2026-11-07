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

- `GET /api/password` - Generate a random password (`length` 4-128, default 12;
  `numbers`, `symbols`, `lowercase`, `uppercase` are on unless set to `false`)
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
$ git clone https://github.com/moebiusmania/sl-utils.git
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

The app listens on port `3000` inside the container and is published on
`127.0.0.1:3200`, so by default it is only reachable from the host itself
(`http://localhost:3200`). Set `SL_UTILS_BIND` (see below) to publish it on the
interface your reverse proxy connects to.

Useful commands:

```
$ docker compose logs -f
$ docker compose down
```

The runtime image is distroless: it has no shell and no package manager. The
server is bundled into a single file, so the image does not include
`node_modules`. Base images are pinned by digest. The container runs as a
non-root user on a read-only root filesystem, with root-owned (read-only) app
files, all Linux capabilities dropped, and memory, swap, CPU, process and file
descriptor limits applied.

### Configuration

| Variable          | Default         | Description                          |
| ----------------- | --------------- | ------------------------------------ |
| `SL_UTILS_BIND`   | `127.0.0.1`     | Host address to bind the published port to |
| `SL_UTILS_PORT`   | `3200`          | Host port                            |
| `SL_UTILS_SUBNET` | `172.28.0.0/24` | Docker network subnet                |

Put host-specific values in a `.env` file next to `compose.yaml` (it is
git-ignored and read automatically by Docker Compose).

Pick the bind address based on where the reverse proxy runs:

- **Same host:** keep the default `127.0.0.1`.
- **Another machine over a VPN or overlay network:** use this host's IP on that
  network, so the app is reachable only through the VPN:

  ```
  # .env
  SL_UTILS_BIND=<this host's VPN IP>
  ```

  If the VPN interface comes up after Docker at boot, the container cannot bind
  to its address and fails to start. Allow binding to addresses that are not up
  yet:

  ```
  $ echo 'net.ipv4.ip_nonlocal_bind = 1' | sudo tee /etc/sysctl.d/99-nonlocal-bind.conf
  $ sudo sysctl -p /etc/sysctl.d/99-nonlocal-bind.conf
  ```

- **Any device on the LAN:** `SL_UTILS_BIND=0.0.0.0`. Docker-published ports
  bypass host firewalls such as ufw, so only do this on a trusted network.

After changing the bind, check that the app is still reachable through the
reverse proxy.

### Egress lockdown

Docker's default bridge network lets the container reach the host and other
devices on your LAN. `scripts/docker-egress-lockdown.sh` adds iptables rules
that restrict the container to DNS and public HTTP/HTTPS. It drops traffic to
the Compose subnet, private ranges, link-local addresses, CGNAT ranges (used by
many mesh VPNs), and new connections to host services.

DNS is allowed only to the host's upstream resolvers, because Docker's embedded
DNS forwards queries from inside the container. By default the script reads
them from `/etc/resolv.conf` (or the systemd-resolved upstreams when the host
uses a local stub resolver), even when they sit in a private or CGNAT range.
Set `SL_UTILS_DNS` (space-separated IPs) to override them, and restart the
service if the host's resolvers change.

To apply the rules automatically whenever Docker starts, install the script and
the systemd unit:

```
$ sudo install -m 0755 scripts/docker-egress-lockdown.sh /usr/local/sbin/sl-utils-egress-lockdown
$ sudo install -m 0644 scripts/sl-utils-egress.service /etc/systemd/system/
$ sudo systemctl daemon-reload
$ sudo systemctl enable --now sl-utils-egress.service
```

To use a custom `SL_UTILS_DNS` or `SL_UTILS_SUBNET`, add them with
`sudo systemctl edit sl-utils-egress` (`[Service]` / `Environment=...`). After
editing the script, re-run the `install` command and
`sudo systemctl restart sl-utils-egress`. Stopping the service removes the
rules.

You can also run the script by hand (`sudo ./scripts/docker-egress-lockdown.sh`,
and `--remove` to undo it), but the rules will not survive a reboot. IPv6 is not
covered; the Compose network keeps IPv6 disabled.

`/api/meta` also rejects private and local addresses itself, including after
redirects. For stricter egress control, use an allowlisting proxy instead of
direct internet access.

### Public exposure

The app has no authentication. If you expose it beyond your LAN, put it behind a
reverse proxy that provides TLS, rate limiting, and security headers, and avoid
publishing the container port directly to the internet.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file
for details.
