// https://vike.dev/onRenderHtml
export { onRenderHtml };

import { renderToString } from "preact-render-to-string";
import { dangerouslySkipEscape, escapeInject } from "vike/server";
import type { PageContextServer } from "vike/types";
import { getPageDescription, getPageTitle } from "./getPageTitle.ts";
import { Layout } from "./Layout.tsx";

const onRenderHtml = (pageContext: PageContextServer) => {
  const { Page } = pageContext;

  if (!Page) {
    throw new Error(
      "My onRenderHtml() hook expects pageContext.Page to be defined",
    );
  }

  const pageHtml = renderToString(
    <Layout pageContext={pageContext}>
      <Page />
    </Layout>,
  );

  const title = getPageTitle(pageContext);
  const description = getPageDescription(pageContext);

  const documentHtml = escapeInject`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <!-- Blocking on purpose: sets the theme before first paint -->
        <script src="/theme.js"></script>
        <title>${title}</title>
        <meta name="description" content="${description}" />
        <meta name="author" content="Salvatore Laisa" />
        <link rel="icon" href="/sl.png" />
      </head>
      <body>
        <div id="root">${dangerouslySkipEscape(pageHtml)}</div>
      </body>
    </html>`;

  return {
    documentHtml,
  };
};
