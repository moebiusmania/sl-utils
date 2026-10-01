import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import { PageLayout } from "../components/PageLayout.tsx";

export default define.page(function Error404() {
  return (
    <>
      <Head>
        <title>404 - Page not found</title>
      </Head>
      <PageLayout
        title="404 - Page not found"
        subtitle="The page you were looking for doesn't exist."
      />
    </>
  );
});
