import { define } from "../utils.ts";

export default define.page(function App({ Component, url }) {
  const isDark = url ? new URL(url.href).searchParams.has("dark") : false;

  return (
    <html class={isDark ? "dark" : ""} lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>sl-utils 🛠️</title>
        <meta
          name="description"
          content="A collection of small utilities for myself 🤓"
        />
        <meta name="author" content="Salvatore Laisa" />
        <link rel="icon" href="/sl.png" />
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
});
