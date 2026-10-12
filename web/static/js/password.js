document.addEventListener("alpine:init", () => {
  Alpine.data("passwordGenerator", () => ({
    length: 12,
    numbers: true,
    symbols: true,
    lowercase: true,
    uppercase: true,
    generating: false,
    copied: false,

    // Sent with the request. Every set is sent explicitly, as the API
    // enables the sets that are missing.
    get params() {
      return JSON.stringify({
        length: this.length,
        numbers: this.numbers,
        symbols: this.symbols,
        lowercase: this.lowercase,
        uppercase: this.uppercase,
      });
    },

    removeResult() {
      document.querySelector(".result")?.remove();
    },

    async copy(password) {
      try {
        await navigator.clipboard.writeText(password);
        this.copied = true;
        setTimeout(() => (this.copied = false), 2000);
      } catch (error) {
        console.error("Failed to copy password:", error);
      }
    },
  }));
});
