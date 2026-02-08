import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import QRCodeGenerator from "../islands/QRCodeGenerator.tsx";

export default define.page(function QRCodePage() {
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
});
