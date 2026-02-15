# sl-utils

> 🛠️ A collection of small utilities for myself 🤓

https://sl-utils.moebiusmania.deno.net/

Some simple and small APIs (_with some companion UIs_) to make my life easier.

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
