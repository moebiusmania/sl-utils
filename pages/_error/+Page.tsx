import { PageLayout } from "../../components/PageLayout.tsx";
import { usePageContext } from "../../renderer/usePageContext.tsx";

export default function ErrorPage() {
  const pageContext = usePageContext();
  const is404 = pageContext.is404;

  return (
    <PageLayout
      title={is404 ? "404 - Page not found" : "Something went wrong"}
      subtitle={pageContext.abortReason ??
        (is404
          ? "The page you were looking for doesn't exist."
          : "An unexpected error occurred.")}
    />
  );
}
