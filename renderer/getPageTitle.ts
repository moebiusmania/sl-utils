import type { PageContext } from "vike/types";

export const getPageTitle = (pageContext: PageContext): string =>
  pageContext.config.title ?? "sl-utils 🛠️";

export const getPageDescription = (pageContext: PageContext): string =>
  pageContext.config.description ??
  "A collection of small utilities for myself 🤓";
