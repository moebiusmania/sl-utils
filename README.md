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

- [Deno](https://deno.land/) - Typescript native runtime
- [Fresh](https://fresh.deno.dev/) v2 - 1st party Web framework (Vite-based)

and some modules:

- [qrcode](https://jsr.io/@libs/qrcode)

published on [Deno Deploy](https://deno.com/deploy) free tier.

## How to use

Make sure to install Deno on your machine:
https://deno.land/manual/getting_started/installation

Then, clone the repository:

```
$ git clone https://github.com/salvatorelaisa/sl-utils.git
$ cd sl-utils
```

Install dependencies and start the project:

```
$ deno install
$ deno task dev
```

For production build and run:

```
$ deno task build
$ deno task start
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file
for details.
