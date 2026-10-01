import { define } from "../utils.ts";
import ThemeToggle from "../islands/ThemeToggle.tsx";

export default define.page(function App({ Component }) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* Blocking on purpose: sets the theme before first paint */}
        <script src="/theme.js"></script>
        <title>sl-utils 🛠️</title>
        <meta
          name="description"
          content="A collection of small utilities for myself 🤓"
        />
        <meta name="author" content="Salvatore Laisa" />
        <link rel="icon" href="/sl.png" />
      </head>
      <body>
        <ThemeToggle />
        <Component />
      </body>
    </html>
  );
});
