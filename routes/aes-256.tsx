import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import Aes256Cipher from "../islands/Aes256Cipher.tsx";

export default define.page(function AES256Page() {
  return (
    <>
      <Head>
        <title>AES-256 Encrypt/Decrypt - sl-utils 🛠️</title>
        <meta
          name="description"
          content="Encrypt/decrypt text with AES-256 in the browser"
        />
        <link rel="stylesheet" href="/aes256.css" />
      </Head>

      <main class="aes-main">
        <Aes256Cipher />
      </main>
    </>
  );
});
