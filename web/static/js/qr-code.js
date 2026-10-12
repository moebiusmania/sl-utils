document.addEventListener("alpine:init", () => {
  Alpine.data("qrCodeGenerator", () => ({
    url: "",
    generating: false,
    error: "",

    get params() {
      return JSON.stringify({ url: this.url.trim() });
    },

    removeResult() {
      document.querySelector(".result")?.remove();
    },

    // The image is a data URL of the SVG: download the SVG itself.
    download(img) {
      const src = img.getAttribute("src");
      const svg = decodeURIComponent(src.slice(src.indexOf(",") + 1));
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = "qrcode.svg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(href);
    },
  }));
});
