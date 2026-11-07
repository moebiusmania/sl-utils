import { PageLayout } from "../../components/PageLayout.tsx";
import Aes256Cipher from "../../components/Aes256Cipher.tsx";

export default function AES256Page() {
  return (
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
  );
}
