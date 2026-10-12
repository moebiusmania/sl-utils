// Runs before first paint (blocking script in <head>) to apply the theme
// without a flash of the wrong colors. Keep in sync with ThemeToggle.tsx.
(function () {
  let theme = null;
  try {
    theme = localStorage.getItem("sl-utils-theme");
  } catch (_) {
    // Storage unavailable: fall back to the system preference
  }
  // Legacy "?dark" links still open in dark mode
  if (new URLSearchParams(location.search).has("dark")) theme = "dark";
  const dark = theme
    ? theme === "dark"
    : matchMedia("(prefers-color-scheme: dark)").matches;
  if (dark) document.documentElement.classList.add("dark");
})();
