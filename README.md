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

- [Go](https://go.dev/) - the HTTP server, the APIs and the HTML (standard
  library router and `html/template`)
- [htmx](https://htmx.org/) 2.0.11 - the forms that ask the server for results
  (passwords, QR codes, social previews)
- [Alpine.js](https://alpinejs.dev/) 3.17.4 - the interactive bits that run in
  the browser (timer, notes, AES-256, form state)

and some modules:

- [whatwg-url](https://github.com/nlnwa/whatwg-url) - URL parsing that matches
  browsers, for `/api/meta`

There is no JavaScript build step: everything, including templates and static
files, is embedded in a single Go binary.

### How it fits together

- `main.go` registers the routes and serves `web/static` from the site root.
- `internal/api` implements the APIs, `internal/fragments` the HTML fragments
  requested by htmx (e.g. `GET /qr-code/generate`), `internal/views` renders
  the templates.
- `web/templates` holds the layout, the shared partials and one template per
  page; `web/static/js` the Alpine components of each page.
- htmx and Alpine are vendored in `web/static/vendor`. To update them, download
  the new `dist/htmx.min.js` / `dist/cdn.min.js` from npm (e.g. through
  `https://cdn.jsdelivr.net/npm/htmx.org@<version>/dist/htmx.min.js`), save
  them with the version in the name and update `web/templates/layout.html`.

## How to use

Make sure to install [Go](https://go.dev/doc/install) 1.27+ on your machine.

Then, clone the repository:

```
$ git clone https://github.com/moebiusmania/sl-utils.git
$ cd sl-utils
```

Start the project in development mode on http://localhost:8080:

```
$ go run . -dev
```

In development, templates and static files are read from disk on every
request: edit them and reload the page, no restart needed (Go code changes
still need one).

For production build and run:

```
$ go build -o sl-utils .
$ ./sl-utils
```

The server listens on `$PORT` (default `8080`).

To run the checks:

```
$ gofmt -l . && go vet ./... && go test ./...
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file
for details.
