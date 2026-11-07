import { createContext } from "preact";
import { useContext } from "preact/hooks";
import type { ComponentChildren } from "preact";
import type { PageContext } from "vike/types";

export { PageContextProvider };
export { usePageContext };

const Context = createContext<PageContext>(undefined as unknown as PageContext);

const PageContextProvider = (
  { pageContext, children }: {
    pageContext: PageContext;
    children: ComponentChildren;
  },
) => (
  <Context.Provider value={pageContext}>
    {children}
  </Context.Provider>
);

function usePageContext() {
  return useContext(Context);
}
