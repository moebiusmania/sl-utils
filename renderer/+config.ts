import type { Config } from "vike/types";

// https://vike.dev/config
export default {
  // Use server routing: every navigation is a regular page load. Pages still
  // hydrate on the client.
  clientRouting: false,
  hydrationCanBeAborted: true,

  // https://vike.dev/passToClient
  passToClient: ["pageProps", "urlPathname"],

  // https://vike.dev/meta
  meta: {
    title: {
      env: { server: true, client: true },
    },
    description: {
      env: { server: true, client: true },
    },
  },
} satisfies Config;
