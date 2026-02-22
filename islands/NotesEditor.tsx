import { useState, useEffect, useCallback } from "preact/hooks";

const STORAGE_KEY = "sl-utils-notes";

function getStoredContent(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveContent(value: string) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch (_) {}
}

export default function NotesEditor() {
  const [value, setValue] = useState("");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setValue(getStoredContent());
    setIsDark(new URL(window.location.href).searchParams.has("dark"));
  }, []);

  const handleInput = useCallback((e: Event) => {
    const target = e.target as HTMLTextAreaElement;
    const next = target.value;
    setValue(next);
    saveContent(next);
  }, []);

  const notesPath = "/notes";
  const notesPathDark = "/notes?dark";

  return (
    <div class="notes-container">
      <textarea
        class="notes-textarea"
        value={value}
        onInput={handleInput}
        placeholder="Start typing..."
        spellcheck={true}
      />
      <div class="notes-footer">
        <a href={isDark ? "/?dark" : "/"} class="back-link">
          ← Back home
        </a>
        <span class="notes-footer-sep"> · </span>
        <a
          href={isDark ? notesPath : notesPathDark}
          class="back-link"
        >
          {isDark ? "Light mode" : "Dark mode"}
        </a>
      </div>
    </div>
  );
}
