import { qrcode } from "@libs/qrcode";

export const handler = (_req: Request): Response => {
  const { searchParams } = new URL(_req.url);
  const url = searchParams.get("url");

  if (!url) {
    return new Response(
      "URL is required: add '?url=<url> in the address bar'",
      { status: 400 },
    );
  }

  const qr = qrcode(url, { output: "svg" });
  return new Response(qr, {
    headers: { "Content-Type": "image/svg+xml" },
  });
};
