import type { JSX } from "preact";

declare global {
  namespace Vike {
    interface PageContext {
      Page: () => JSX.Element;
      config: {
        /** Value for <title> defined by the page's +config.ts */
        title?: string;
        /** Value for <meta name="description"> defined by the page's +config.ts */
        description?: string;
      };
      /** https://vike.dev/render */
      abortReason?: string;
    }
  }
}

// Tell TypeScript this file isn't an ambient module
export {};
