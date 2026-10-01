// Keep the key in sync with static/theme.js, which applies it before paint.
const THEME_STORAGE_KEY = "sl-utils-theme";

export default function ThemeToggle() {
  const toggleTheme = () => {
    const dark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem(THEME_STORAGE_KEY, dark ? "dark" : "light");
    } catch (_) {
      // Storage unavailable: the choice just won't be remembered
    }
  };

  // Both icons are rendered and CSS shows the right one based on html.dark,
  // so the button is correct before hydration.
  return (
    <button
      type="button"
      class="theme-toggle"
      onClick={toggleTheme}
      title="Toggle light/dark theme"
      aria-label="Toggle light/dark theme"
    >
      <svg
        class="theme-icon--moon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
      <svg
        class="theme-icon--sun"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    </button>
  );
}
