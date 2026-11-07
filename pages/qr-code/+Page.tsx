import { PageLayout } from "../../components/PageLayout.tsx";
import QRCodeGenerator from "../../components/QRCodeGenerator.tsx";

export default function QRCodePage() {
  return (
    <PageLayout
      title="QR Code Generator"
      subtitle="Generate QR codes for any URL quickly and easily"
    >
      <QRCodeGenerator />
    </PageLayout>
  );
}
