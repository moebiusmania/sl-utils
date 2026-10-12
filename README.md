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

- [Go](https://go.dev/) - the HTTP server and the APIs, using the standard
  library router
- [Inertia.js](https://inertiajs.com/) v3 - pages are Vue components rendered
  by the Go server, with server-side rendering
- [Vue](https://vuejs.org/) 3 and [Vite](https://vite.dev/) - the UI and its
  build

and some modules:

- [whatwg-url](https://github.com/nlnwa/whatwg-url) - URL parsing that matches
  browsers, for `/api/meta`

### How it fits together

- `main.go` registers the routes; `internal/api` implements the APIs and
  `internal/inertia` is a small Inertia adapter that renders pages into
  `templates/app.html`.
- `frontend/pages` holds one Vue component per page, `frontend/components` the
  shared and interactive components.
- Pages are server-rendered by a Node process (the Inertia SSR server built
  from `frontend/app.ts`). If it is not running, pages fall back to
  client-side rendering.
- Files in `static/` are served from the site root.

## How to use

Make sure to install [Go](https://go.dev/doc/install) 1.27+ and
[Node.js](https://nodejs.org/) 22+ on your machine.

Then, clone the repository:

```
$ git clone https://github.com/moebiusmania/sl-utils.git
$ cd sl-utils
```

Install dependencies and start the project on http://localhost:8080:

```
$ npm install
$ npm run dev
```

In development the Go server proxies assets, hot reload and SSR to the Vite dev
server, so everything goes through port 8080.

For production build and run:

```
$ npm run build
$ npm start
```

This builds the client bundle, the SSR bundle and the Go binary into `dist/`,
then runs the SSR server (`node dist/ssr/app.js`) and the Go server
(`dist/sl-utils`) together. The Go server listens on `$PORT` (default `8080`)
and reaches the SSR server at `$SSR_URL` (default
`http://127.0.0.1:13714/render`).

To run the checks (type check, `go vet`, tests, formatting):

```
$ npm run check
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file
for details.
