import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import PasswordGenerator from "../islands/PasswordGenerator.tsx";

export default define.page(function PasswordPage() {
  return (
    <>
      <Head>
        <title>Password Generator - sl-utils 🛠️</title>
        <meta
          name="description"
          content="Generate secure passwords with customizable options"
        />
      </Head>

      <main class="password-main">
        <PasswordGenerator />
      </main>
    </>
  );
});
