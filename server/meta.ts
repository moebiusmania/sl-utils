import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

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

const MAX_REDIRECTS = 5;
// Each fetch can hold up to MAX_BYTES for TIMEOUT_MS; capping parallel fetches
// keeps a burst of requests from exhausting the container's memory.
const MAX_CONCURRENT_FETCHES = 8;
let activeFetches = 0;

const isBlockedHostname = (host: string): boolean =>
  host === "localhost" ||
  host.endsWith(".localhost") ||
  host.endsWith(".local") ||
  host.endsWith(".internal");

// Non-public IPv4 ranges as [network, prefix length].
const BLOCKED_V4: Array<[string, number]> = [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // CGNAT (Tailscale, NetBird)
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, cloud metadata
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // TEST-NET-1
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // TEST-NET-2
  ["203.0.113.0", 24], // TEST-NET-3
  ["224.0.0.0", 3], // multicast, reserved, broadcast
];

const v4ToInt = (ip: string): number =>
  ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;

const isBlockedV4 = (ip: string): boolean => {
  const addr = v4ToInt(ip);
  return BLOCKED_V4.some(([net, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return ((addr & mask) >>> 0) === ((v4ToInt(net) & mask) >>> 0);
  });
};

// Expands an IPv6 address to its 8 hextets, including embedded IPv4 tails.
const expandV6 = (ip: string): number[] | null => {
  let addr = ip.toLowerCase().split("%")[0];
  const v4Tail = addr.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Tail) {
    const n = v4ToInt(v4Tail[1]);
    addr = addr.slice(0, -v4Tail[1].length) +
      `${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`;
  }
  const [head, tail = ""] = addr.split("::");
  const parse = (s: string) => (s ? s.split(":").map((h) => parseInt(h, 16)) : []);
  const left = parse(head);
  const right = parse(tail);
  const fill = addr.includes("::") ? 8 - left.length - right.length : 0;
  const parts = [...left, ...Array(Math.max(fill, 0)).fill(0), ...right];
  return parts.length === 8 && parts.every((p) => p >= 0 && p <= 0xffff)
    ? parts
    : null;
};

const isBlockedV6 = (ip: string): boolean => {
  const h = expandV6(ip);
  if (!h) return true;
  const toV4 = (hi: number, lo: number) =>
    `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`;
  const zeroPrefix = h.slice(0, 5).every((x) => x === 0);
  if (zeroPrefix && h[5] === 0xffff) return isBlockedV4(toV4(h[6], h[7])); // ::ffff:a.b.c.d
  if (zeroPrefix && h[5] === 0) return true; // ::, ::1, IPv4-compatible
  if (h[0] === 0x64 && h[1] === 0xff9b) return isBlockedV4(toV4(h[6], h[7])); // NAT64
  if (h[0] === 0x2002) return isBlockedV4(toV4(h[1], h[2])); // 6to4
  return (h[0] & 0xfe00) === 0xfc00 || // unique local
    (h[0] & 0xffc0) === 0xfe80 || // link-local
    (h[0] & 0xffc0) === 0xfec0 || // site-local (deprecated)
    (h[0] & 0xff00) === 0xff00 || // multicast
    (h[0] === 0x2001 && h[1] === 0x0db8) || // documentation
    (h[0] === 0x2001 && h[1] < 0x0200); // Teredo, benchmarking, ORCHID etc.
};

export const isBlockedAddress = (ip: string): boolean => {
  const family = isIP(ip);
  if (family === 4) return isBlockedV4(ip);
  if (family === 6) return isBlockedV6(ip);
  return true;
};

/**
 * Rejects URLs whose host is, or resolves to, a non-public address. Every
 * resolved address is checked so a name with one public and one private record
 * cannot slip through. A rebinding window between this lookup and the fetch's
 * own lookup remains; the host egress firewall covers that case.
 */
const assertPublicTarget = async (url: URL): Promise<void> => {
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (isBlockedHostname(host)) throw new BlockedTargetError();
  const addresses = isIP(host)
    ? [host]
    : (await lookup(host, { all: true, verbatim: true })).map((a) => a.address);
  if (addresses.length === 0 || addresses.some(isBlockedAddress)) {
    throw new BlockedTargetError();
  }
};

class BlockedTargetError extends Error {
  constructor() {
    super("Private or local addresses are not allowed");
  }
}

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

export const handleMetaRequest = async (
  input: string | null,
): Promise<Response> => {
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
  if (activeFetches >= MAX_CONCURRENT_FETCHES) {
    return Response.json({ error: "Too many requests, try again shortly" }, {
      status: 503,
      headers: { "Retry-After": "5" },
    });
  }
  activeFetches++;

  try {
    const signal = AbortSignal.timeout(TIMEOUT_MS);
    let url = target;
    let res: Response;
    // Follow redirects by hand so every hop is validated before it is fetched.
    for (let hop = 0;; hop++) {
      await assertPublicTarget(url);
      res = await fetch(url, {
        redirect: "manual",
        signal,
        headers: {
          // Many sites only serve meta tags to known link-preview bots
          "User-Agent":
            "Mozilla/5.0 (compatible; sl-utils-preview/1.0; +https://sl-utils.moebiusmania.deno.net) facebookexternalhit/1.1 Twitterbot/1.0",
          "Accept": "text/html,application/xhtml+xml",
        },
      });
      const location = res.headers.get("location");
      if (res.status < 300 || res.status >= 400 || !location) break;
      await res.body?.cancel();
      if (hop >= MAX_REDIRECTS) return error("Too many redirects", 502);
      url = new URL(location, url);
      if (!["http:", "https:"].includes(url.protocol)) {
        return error("Redirected to an unsupported URL scheme", 502);
      }
    }

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
    return Response.json(extractMeta(html, res.url || url.href));
  } catch (e) {
    if (e instanceof BlockedTargetError) return error(e.message, 400);
    const timeout = e instanceof DOMException && e.name === "TimeoutError";
    // Log only the origin: paths and queries may carry user data. JSON.stringify
    // keeps attacker-controlled text from forging log lines.
    console.warn(JSON.stringify({
      level: "warn",
      event: "meta_fetch_failed",
      origin: target.origin,
      error: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
    }));
    return error(
      timeout ? "The page took too long to respond" : "Could not fetch the page",
      502,
    );
  } finally {
    activeFetches--;
  }
};
