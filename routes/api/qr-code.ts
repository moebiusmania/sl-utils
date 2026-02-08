import { qrcode } from "@libs/qrcode";
import { define } from "../../utils.ts";

export const handler = define.handlers({
  GET(ctx) {
    const { searchParams } = new URL(ctx.req.url);
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
  },
});
