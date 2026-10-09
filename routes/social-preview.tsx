import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import { PageLayout } from "../components/PageLayout.tsx";
import SocialPreview from "../islands/SocialPreview.tsx";

export default define.page(function SocialPreviewPage() {
  return (
    <>
      <Head>
        <title>Social Preview - sl-utils 🛠️</title>
        <meta
          name="description"
          content="See how a link will look when shared on social networks"
        />
      </Head>

      <PageLayout
        title="Social Preview"
        subtitle="See how a link will look when shared on social networks"
        wide
      >
        <SocialPreview />
      </PageLayout>
    </>
  );
});
