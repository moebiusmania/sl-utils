// https://vike.dev/onRenderClient
export { onRenderClient };

import { hydrate, render } from "preact";
import type { PageContextClient } from "vike/types";
import { getPageTitle } from "./getPageTitle.ts";
import { Layout } from "./Layout.tsx";

let root: Element | null = null;

const onRenderClient = (pageContext: PageContextClient) => {
  const { Page } = pageContext;

  if (!Page) {
    throw new Error(
      "My onRenderClient() hook expects pageContext.Page to be defined",
    );
  }

  const container = document.getElementById("root");
  if (!container) {
    throw new Error("DOM element #root not found");
  }

  const page = (
    <Layout pageContext={pageContext}>
      <Page />
    </Layout>
  );

  if (pageContext.isHydration) {
    hydrate(page, container);
    root = container;
  } else {
    if (!root) root = container;
    render(page, root);
  }

  document.title = getPageTitle(pageContext);
};
