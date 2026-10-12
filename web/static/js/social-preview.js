document.addEventListener("alpine:init", () => {
  Alpine.data("socialPreview", () => ({
    url: "",
    loading: false,
    error: "",

    get params() {
      return JSON.stringify({ url: this.url.trim() });
    },

    removeResults() {
      document.querySelector(".social-results")?.remove();
    },

    // Images that fail to load are replaced by their placeholders.
    imageFailed(img) {
      const empty = document.createElement("div");
      empty.className = `${img.className} social-image--empty`;
      empty.textContent = "No image";
      img.replaceWith(empty);
    },

    faviconFailed(img) {
      const empty = document.createElement("span");
      empty.className = "social-favicon";
      img.replaceWith(empty);
    },
  }));
});
