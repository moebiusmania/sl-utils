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
    <div class="qr-container">
      <header class="qr-header">
        <h1 class="qr-title">QR Code Generator</h1>
        <p class="qr-subtitle">
          Generate QR codes for any URL quickly and easily
        </p>
      </header>

      <form class="qr-form" onSubmit={handleSubmit}>
        <div class="form-group">
          <label class="form-label" htmlFor="url">
            Enter URL
          </label>
          <input
            type="url"
            id="url"
            class="url-input"
            placeholder="https://example.com"
            value={url}
            onInput={(e) => {
              setUrl(e.currentTarget.value);
              setError("");
            }}
          />
          {url && !isValidUrl(url) && (
            <p class="input-error">Please enter a valid URL</p>
          )}
        </div>

        {error && (
          <div class="error-message">
            {error}
          </div>
        )}

        <button
          type="submit"
          class="generate-button"
          disabled={isGenerating || !url.trim() || !isValidUrl(url)}
        >
          {isGenerating ? "Generating..." : "Generate QR Code"}
        </button>
      </form>

      {qrCodeSvg && (
        <div class="qr-result">
          <label class="result-label">Generated QR Code:</label>
          <div class="qr-display">
            <div
              class="qr-code"
              dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
            />
            <div class="qr-actions">
              <button
                type="button"
                class="download-button"
                onClick={downloadQRCode}
                title="Download QR code as SVG"
              >
                📥 Download SVG
              </button>
            </div>
          </div>
          <p class="qr-info">
            Scan this QR code to visit: <span class="url-display">{url}</span>
          </p>
        </div>
      )}

      <div class="qr-footer">
        <a href="/" class="back-link">← Back to Home</a>
      </div>
    </div>
  );
}
