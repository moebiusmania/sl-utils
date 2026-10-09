import { define } from "../../utils.ts";

export interface MetaPreview {
  url: string;
  title: string;
  description: string;
  image: string;
  siteName: string;
  favicon: string;
  themeColor: string;
  twitterCard: string;
  twitterSite: string;
  tags: Record<string, string>;
}

const MAX_BYTES = 1_000_000;
const TIMEOUT_MS = 8_000;

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

const decodeEntities = (value: string): string =>
  value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x"
        ? parseInt(code.slice(2), 16)
        : parseInt(code.slice(1), 10);
      return Number.isNaN(n) ? match : String.fromCodePoint(n);
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });

const parseAttributes = (tag: string): Record<string, string> => {
  const attrs: Record<string, string> = {};
  const re = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  for (const m of tag.matchAll(re)) {
    attrs[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return attrs;
};

const isPrivateHost = (hostname: string): boolean => {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    (host.includes(":") && /^(::1?$|fc|fd|fe80:|::ffff:)/.test(host)) ||
    /^(0|10|127)\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^192\.168\./.test(host);
};

const readHead = async (res: Response): Promise<string> => {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let html = "";
  let bytes = 0;
  while (bytes < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    html += decoder.decode(value, { stream: true });
    // Everything we need lives in <head>
    if (/<\/head\s*>/i.test(html)) break;
  }
  await reader.cancel().catch(() => {});
  return html;
};

export const extractMeta = (html: string, pageUrl: string): MetaPreview => {
  const head = html.split(/<\/head\s*>/i)[0];
  const tags: Record<string, string> = {};

  for (const [tag] of head.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = parseAttributes(tag);
    const key = (attrs.property ?? attrs.name ?? attrs.itemprop)
      ?.toLowerCase();
    if (key && attrs.content !== undefined && !(key in tags)) {
      tags[key] = attrs.content.trim();
    }
  }

  const links: Record<string, string> = {};
  for (const [tag] of head.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = parseAttributes(tag);
    const rel = attrs.rel?.toLowerCase();
    if (rel && attrs.href && !(rel in links)) links[rel] = attrs.href;
  }

  const titleMatch = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const htmlTitle = titleMatch ? decodeEntities(titleMatch[1]).trim() : "";

  const resolve = (value: string | undefined): string => {
    if (!value) return "";
    try {
      return new URL(value, pageUrl).href;
    } catch {
      return "";
    }
  };

  return {
    url: resolve(tags["og:url"] || links["canonical"]) || pageUrl,
    title: tags["og:title"] || tags["twitter:title"] || htmlTitle,
    description: tags["og:description"] || tags["twitter:description"] ||
      tags["description"] || "",
    image: resolve(
      tags["og:image"] || tags["og:image:url"] ||
        tags["og:image:secure_url"] || tags["twitter:image"] ||
        tags["twitter:image:src"],
    ),
    siteName: tags["og:site_name"] || tags["application-name"] || "",
    favicon: resolve(
      links["icon"] || links["shortcut icon"] || links["apple-touch-icon"] ||
        "/favicon.ico",
    ),
    themeColor: tags["theme-color"] || "",
    twitterCard: tags["twitter:card"] || "",
    twitterSite: tags["twitter:site"] || "",
    tags: { ...tags, ...(htmlTitle ? { "<title>": htmlTitle } : {}) },
  };
};

const error = (message: string, status: number) =>
  Response.json({ error: message }, { status });

export const handler = define.handlers({
  async GET(ctx) {
    const { searchParams } = new URL(ctx.req.url);
    const input = searchParams.get("url");

    if (!input) {
      return error("URL is required: add '?url=<url>' in the address bar", 400);
    }

    let target: URL;
    try {
      target = new URL(input);
    } catch {
      return error("Invalid URL", 400);
    }
    if (!["http:", "https:"].includes(target.protocol)) {
      return error("Only http and https URLs are supported", 400);
    }
    if (isPrivateHost(target.hostname)) {
      return error("Private or local addresses are not allowed", 400);
    }

    try {
      const res = await fetch(target, {
        redirect: "follow",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          // Many sites only serve meta tags to known link-preview bots
          "User-Agent":
            "Mozilla/5.0 (compatible; sl-utils-preview/1.0; +https://sl-utils.moebiusmania.deno.net) facebookexternalhit/1.1 Twitterbot/1.0",
          "Accept": "text/html,application/xhtml+xml",
        },
      });

      if (!res.ok) {
        await res.body?.cancel();
        return error(`The page responded with ${res.status}`, 502);
      }
      const type = res.headers.get("content-type") ?? "";
      if (!type.includes("html")) {
        await res.body?.cancel();
        return error(`Not an HTML page (${type || "unknown type"})`, 422);
      }

      const html = await readHead(res);
      return Response.json(extractMeta(html, res.url || target.href));
    } catch (e) {
      const message = e instanceof DOMException && e.name === "TimeoutError"
        ? "The page took too long to respond"
        : "Could not fetch the page";
      return error(message, 502);
    }
  },
});
