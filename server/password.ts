import {
  CHARSETS,
  type CharsetName,
  generatePassword,
  PasswordOptionsError,
} from "../lib/password.ts";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * GET /api/password?length=12&numbers=false...
 * Every charset is on unless explicitly set to "false". The /password page
 * generates passwords in the browser and does not call this endpoint.
 */
export const handlePasswordRequest = (
  searchParams: URLSearchParams,
): Response => {
  const rawLength = searchParams.get("length");
  const length = rawLength === null ? 12 : Number(rawLength);
  const charsets = (Object.keys(CHARSETS) as CharsetName[]).filter(
    (c) => searchParams.get(c) !== "false",
  );

  try {
    return new Response(generatePassword({ length, charsets }), {
      headers: { "Content-Type": "text/plain; charset=utf-8", ...NO_STORE },
    });
  } catch (e) {
    if (e instanceof PasswordOptionsError) {
      return new Response(e.message, { status: 400, headers: NO_STORE });
    }
    throw e;
  }
};
