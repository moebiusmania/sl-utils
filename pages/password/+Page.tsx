import { PageLayout } from "../../components/PageLayout.tsx";
import PasswordGenerator from "../../components/PasswordGenerator.tsx";

export default function PasswordPage() {
  return (
    <PageLayout
      title="Password Generator"
      subtitle="Create secure passwords with customizable options"
    >
      <PasswordGenerator />
    </PageLayout>
  );
}
