/** Sharing metadata returned by GET /api/meta. */
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

export const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (_) {
    return url;
  }
};

export const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
