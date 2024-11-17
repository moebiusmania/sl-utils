import { type PageProps } from "$fresh/server.ts";
export default function App({ Component, url }: PageProps) {
  const isDark = new URL(url.href).searchParams.has("dark");

  return (
    <html class={isDark ? "dark" : ""}>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>sl-utils 🛠️</title>
        <meta
          name="description"
          content="A collection of small utilities for myself 🤓"
        />
        <meta name="author" content="Salvatore Laisa" />
        <link rel="stylesheet" href="/styles.css" />
        <link rel="icon" href="/sl.png" />
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
}
