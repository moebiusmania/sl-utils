import { useState } from "preact/hooks";

export default function QRCodeGenerator() {
  const [url, setUrl] = useState<string>("");
  const [qrCodeSvg, setQrCodeSvg] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>("");

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    setIsGenerating(true);
    setError("");
    setQrCodeSvg("");

    try {
      const params = new URLSearchParams();
      params.append("url", url.trim());

      const response = await fetch(`/api/qr-code?${params.toString()}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const svgContent = await response.text();
      setQrCodeSvg(svgContent);
    } catch (error) {
      console.error("Error generating QR code:", error);
      setError(
        error instanceof Error ? error.message : "Failed to generate QR code",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQRCode = () => {
    if (qrCodeSvg) {
      const blob = new Blob([qrCodeSvg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "qrcode.svg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
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
          disabled={isGenerating || !url.trim() || !isValidUrl(url)}
        >
          {isGenerating ? "Generating..." : "Generate QR code"}
        </button>
      </form>

      {qrCodeSvg && (
        <div class="result result--center">
          <div class="qr-code">
            <img
              src={`data:image/svg+xml;charset=utf-8,${
                encodeURIComponent(qrCodeSvg)
              }`}
              alt="Generated QR code"
            />
          </div>
          <p class="qr-info">
            Scan to visit <span class="code-span">{url}</span>
          </p>
          <button
            type="button"
            class="btn btn-secondary"
            onClick={downloadQRCode}
            title="Download QR code as SVG"
          >
            Download SVG
          </button>
        </div>
      )}
    </>
  );
}
