import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import vike from "@vikejs/hono";
import type { Server } from "vike/types";
import { handleMetaRequest } from "./server/meta.ts";
import { handleMitLicenseRequest } from "./server/mit-license.ts";
import { handlePasswordRequest } from "./server/password.ts";
import { handleQrCodeRequest } from "./server/qr-code.ts";

const app = new Hono();

// Security headers for every response, pages included, so this must be
// registered before Vike. The CSP only applies in production: Vite's dev
// server relies on inline scripts and a HMR websocket.
app.use(
  secureHeaders({
    contentSecurityPolicy: import.meta.env.PROD
      ? {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        // Social previews show images from the previewed site; QR codes are
        // data: URIs.
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      }
      : undefined,
    strictTransportSecurity: "max-age=31536000",
    referrerPolicy: "strict-origin-when-cross-origin",
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: [],
      payment: [],
      usb: [],
    },
  }),
);

// Make sure Vike is installed before the app routes, so that its middleware
// can run first and page requests are rendered by Vike.
vike(app);

app.get("/api/password", (c) =>
  handlePasswordRequest(new URL(c.req.url).searchParams));

app.get("/api/qr-code", (c) =>
  handleQrCodeRequest(new URL(c.req.url).searchParams.get("url")));

app.get("/api/mit-license", () => handleMitLicenseRequest());

app.get("/api/meta", (c) =>
  handleMetaRequest(new URL(c.req.url).searchParams.get("url")));

// Log unexpected errors server-side and return a generic message, so stack
// traces and internals never reach the client.
app.onError((err, c) => {
  console.error(
    JSON.stringify({
      level: "error",
      method: c.req.method,
      path: c.req.path,
      error: err instanceof Error ? err.stack ?? err.message : String(err),
    }),
  );
  return c.text("Internal server error", 500);
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// https://vike.dev/server
export default {
  fetch: app.fetch,
  prod: { port },
} satisfies Server;
