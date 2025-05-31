import { Head } from "$fresh/runtime.ts";
import QRCodeGenerator from "../islands/QRCodeGenerator.tsx";

export default function QRCodePage() {
  return (
    <>
      <Head>
        <title>QR Code Generator - sl-utils 🛠️</title>
        <meta
          name="description"
          content="Generate QR codes for any URL quickly and easily"
        />
      </Head>

      <main class="qr-main">
        <QRCodeGenerator />
      </main>
    </>
  );
}
