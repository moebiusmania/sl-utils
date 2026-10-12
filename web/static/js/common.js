// Helpers shared by the pages, available to Alpine expressions.

// Keep the key in sync with theme.js, which applies it before paint.
const THEME_STORAGE_KEY = "sl-utils-theme";

function toggleTheme() {
  const dark = document.documentElement.classList.toggle("dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, dark ? "dark" : "light");
  } catch (_) {
    // Storage unavailable: the choice just won't be remembered
  }
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}
