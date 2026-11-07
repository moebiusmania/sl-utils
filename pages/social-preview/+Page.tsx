import { PageLayout } from "../../components/PageLayout.tsx";
import SocialPreview from "../../components/SocialPreview.tsx";

export default function SocialPreviewPage() {
  return (
    <PageLayout
      title="Social Preview"
      subtitle="See how a link will look when shared on social networks"
      wide
    >
      <SocialPreview />
    </PageLayout>
  );
}
