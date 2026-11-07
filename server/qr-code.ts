import { renderSVG } from "uqr";

export const generateQrCodeSvg = (url: string): string =>
  renderSVG(url, { border: 4 });

export const handleQrCodeRequest = (url: string | null): Response => {
  if (!url) {
    return new Response(
      "URL is required: add '?url=<url> in the address bar'",
      { status: 400 },
    );
  }

  return new Response(generateQrCodeSvg(url), {
    headers: { "Content-Type": "image/svg+xml" },
  });
};
