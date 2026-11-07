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

To expose the dev server on the network:

```
$ bun run dev:host
```

For production build and run:

```
$ bun run build
$ bun run start
```

The production build is a standard Bun server in `dist/`, so it can be hosted on
any platform that runs Bun (or Node.js).

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file
for details.
