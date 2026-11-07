import type { ComponentChildren } from "preact";
import type { PageContext } from "vike/types";
import ThemeToggle from "../components/ThemeToggle.tsx";
import { PageContextProvider } from "./usePageContext.tsx";
import "../assets/styles.css";

export { Layout };

const Layout = (
  { children, pageContext }: {
    children: ComponentChildren;
    pageContext: PageContext;
  },
) => (
  <PageContextProvider pageContext={pageContext}>
    <ThemeToggle />
    {children}
  </PageContextProvider>
);
