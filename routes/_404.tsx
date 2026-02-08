import { Head } from "fresh/runtime";
import { define } from "../utils.ts";

export default define.page(function Error404() {
  return (
    <>
      <Head>
        <title>404 - Page not found</title>
      </Head>
      <div class="error-container">
        <div class="error-content">
          <img
            class="error-logo"
            src="/logo.svg"
            width="128"
            height="128"
            alt="the Fresh logo: a sliced lemon dripping with juice"
          />
          <h1 class="error-title">404 - Page not found</h1>
          <p class="error-text">
            The page you were looking for doesn't exist.
          </p>
          <a href="/" class="error-link">Go back home</a>
        </div>
      </div>
    </>
  );
});
