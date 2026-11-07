import { renderSVG } from "uqr";

// Comfortably fits real URLs while staying within QR capacity (~2.9 KB for the
// lowest error correction level).
export const MAX_QR_INPUT_LENGTH = 2048;

export const generateQrCodeSvg = (url: string): string =>
  renderSVG(url, { border: 4 });

const badRequest = (message: string) =>
  new Response(message, {
    status: 400,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });

export const handleQrCodeRequest = (url: string | null): Response => {
  if (!url) {
    return badRequest("URL is required: add '?url=<url>' in the address bar");
  }
  if (url.length > MAX_QR_INPUT_LENGTH) {
    return badRequest(
      `URL is too long (max ${MAX_QR_INPUT_LENGTH} characters)`,
    );
  }

  let svg: string;
  try {
    svg = generateQrCodeSvg(url);
  } catch {
    return badRequest("This text cannot be encoded as a QR code");
  }
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml" },
  });
};
