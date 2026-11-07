import { Hono } from "hono";
import vike from "@vikejs/hono";
import type { Server } from "vike/types";
import { handleMetaRequest } from "./server/meta.ts";
import { handleMitLicenseRequest } from "./server/mit-license.ts";
import { handlePasswordRequest } from "./server/password.ts";
import { handleQrCodeRequest } from "./server/qr-code.ts";

const app = new Hono();

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

app.get("/api/:name", (c) => {
  const name = c.req.param("name");
  return c.text(`Hello, ${name.charAt(0).toUpperCase() + name.slice(1)}!`);
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// https://vike.dev/server
export default {
  fetch: app.fetch,
  prod: { port },
} satisfies Server;
