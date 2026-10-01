import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import { PageLayout } from "../components/PageLayout.tsx";
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
      </Head>

      <PageLayout
        title="AES-256 Encrypt / Decrypt"
        subtitle={
          <>
            Everything runs locally in your browser. Output format:{" "}
            <span class="code-span">salt.iv.ciphertext</span>
          </>
        }
        wide
      >
        <Aes256Cipher />
      </PageLayout>
    </>
  );
});
