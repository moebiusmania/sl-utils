import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import type { MetaPreview } from "../routes/api/meta.ts";

const isValidUrl = (string: string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (_) {
    return url;
  }
};

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

const PreviewImage = ({ src, class: className }: {
  src: string;
  class: string;
}) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <div class={`${className} social-image--empty`}>No image</div>;
  }
  return (
    <img
      class={className}
      src={src}
      alt=""
      referrerpolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
};

const Favicon = ({ src }: { src: string }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <span class="social-favicon" />;
  return (
    <img
      class="social-favicon"
      src={src}
      alt=""
      referrerpolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
};

const Section = (
  { name, children }: { name: string; children: ComponentChildren },
) => (
  <section class="social-section">
    <h2 class="social-section-title">{name}</h2>
    {children}
  </section>
);

const GooglePreview = ({ meta }: { meta: MetaPreview }) => {
  const url = new URL(meta.url);
  const crumbs = url.pathname.split("/").filter(Boolean).join(" › ");
  return (
    <div class="social-google">
      <div class="social-google-site">
        <Favicon src={meta.favicon} />
        <div>
          <div class="social-google-name">
            {meta.siteName || hostOf(meta.url)}
          </div>
          <div class="social-google-url">
            {url.origin}
            {crumbs && ` › ${crumbs}`}
          </div>
        </div>
      </div>
      <div class="social-google-title">{truncate(meta.title, 60)}</div>
      <div class="social-google-desc">{truncate(meta.description, 160)}</div>
    </div>
  );
};

const XPreview = ({ meta }: { meta: MetaPreview }) => {
  if (meta.twitterCard === "summary") {
    return (
      <div class="social-x social-x--small">
        <PreviewImage src={meta.image} class="social-x-thumb" />
        <div class="social-x-body">
          <div class="social-muted">{hostOf(meta.url)}</div>
          <div class="social-x-title">{meta.title}</div>
          <div class="social-muted social-clamp-2">{meta.description}</div>
        </div>
      </div>
    );
  }
  return (
    <div class="social-x">
      <div class="social-x-large">
        <PreviewImage src={meta.image} class="social-image" />
        <span class="social-x-overlay">{truncate(meta.title, 70)}</span>
      </div>
      <div class="social-muted social-x-from">From {hostOf(meta.url)}</div>
    </div>
  );
};

const FacebookPreview = ({ meta }: { meta: MetaPreview }) => (
  <div class="social-card social-facebook">
    <PreviewImage src={meta.image} class="social-image" />
    <div class="social-card-body">
      <div class="social-upper">{hostOf(meta.url)}</div>
      <div class="social-card-title social-clamp-2">{meta.title}</div>
      <div class="social-muted social-clamp-1">{meta.description}</div>
    </div>
  </div>
);

const LinkedInPreview = ({ meta }: { meta: MetaPreview }) => (
  <div class="social-card social-linkedin">
    <PreviewImage src={meta.image} class="social-image" />
    <div class="social-card-body">
      <div class="social-card-title social-clamp-2">{meta.title}</div>
      <div class="social-muted">{hostOf(meta.url)}</div>
    </div>
  </div>
);

const ChatPreview = (
  { meta, variant }: { meta: MetaPreview; variant: "slack" | "discord" },
) => (
  <div
    class={`social-chat social-chat--${variant}`}
    style={variant === "discord" && meta.themeColor
      ? { borderLeftColor: meta.themeColor }
      : undefined}
  >
    <div class="social-chat-site">
      {variant === "slack" && <Favicon src={meta.favicon} />}
      {meta.siteName || hostOf(meta.url)}
    </div>
    <div class="social-chat-title">{meta.title}</div>
    <div class="social-chat-desc social-clamp-3">{meta.description}</div>
    {meta.image && <PreviewImage src={meta.image} class="social-chat-image" />}
  </div>
);

const IMPORTANT_TAGS = [
  "<title>",
  "description",
  "og:title",
  "og:description",
  "og:image",
  "og:url",
  "og:type",
  "og:site_name",
  "twitter:card",
  "twitter:title",
  "twitter:description",
  "twitter:image",
];

const TagsTable = ({ tags }: { tags: Record<string, string> }) => {
  const others = Object.keys(tags)
    .filter((k) =>
      !IMPORTANT_TAGS.includes(k) && /^(og|twitter|article|fb):/.test(k)
    )
    .sort();
  return (
    <table class="social-tags">
      <tbody>
        {[...IMPORTANT_TAGS, ...others].map((key) => (
          <tr>
            <td class="social-tags-key">{key}</td>
            <td class="social-tags-value">
              {tags[key] ?? <span class="social-missing">missing</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default function SocialPreview() {
  const [url, setUrl] = useState<string>("");
  const [meta, setMeta] = useState<MetaPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    setIsLoading(true);
    setError("");
    setMeta(null);

    try {
      const params = new URLSearchParams();
      params.append("url", url.trim());

      const response = await fetch(`/api/meta?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load page metadata");
      }

      setMeta(data);
    } catch (error) {
      console.error("Error loading metadata:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load metadata",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <form class="form" onSubmit={handleSubmit}>
        <div class="form-group">
          <label class="form-label" htmlFor="url">
            URL
          </label>
          <input
            type="url"
            id="url"
            class="input"
            placeholder="https://example.com"
            value={url}
            onInput={(e) => {
              setUrl(e.currentTarget.value);
              setError("");
            }}
          />
          {url && !isValidUrl(url) && (
            <p class="error-text">Please enter a valid URL</p>
          )}
        </div>

        {error && <p class="error-text">{error}</p>}

        <button
          type="submit"
          class="btn btn-primary btn-block"
          disabled={isLoading || !url.trim() || !isValidUrl(url)}
        >
          {isLoading ? "Loading..." : "Preview"}
        </button>
      </form>

      {meta && (
        <div class="social-results">
          <Section name="Google">
            <GooglePreview meta={meta} />
          </Section>
          <Section name="X / Twitter">
            <XPreview meta={meta} />
          </Section>
          <Section name="Facebook">
            <FacebookPreview meta={meta} />
          </Section>
          <Section name="LinkedIn">
            <LinkedInPreview meta={meta} />
          </Section>
          <Section name="Slack">
            <ChatPreview meta={meta} variant="slack" />
          </Section>
          <Section name="Discord">
            <ChatPreview meta={meta} variant="discord" />
          </Section>
          <Section name="Detected tags">
            <TagsTable tags={meta.tags} />
          </Section>
        </div>
      )}
    </>
  );
}
