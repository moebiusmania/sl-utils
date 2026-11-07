import { useCallback, useEffect, useRef, useState } from "preact/hooks";

const STORAGE_KEY = "sl-utils-notes";
const MOBILE_QUERY = "(max-width: 767px)";

export type Document = { title: string; content: string };

function getStoredDocuments(): Document[] {
  if (typeof globalThis.window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    /* Migrate from old single-string format */
    if (typeof parsed === "string") {
      return [{ title: "Notes", content: parsed }];
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (d: unknown): d is Document =>
        d !== null &&
        typeof d === "object" &&
        "title" in d &&
        "content" in d &&
        typeof (d as Document).title === "string" &&
        typeof (d as Document).content === "string",
    );
  } catch (_) {
    return [];
  }
}

function saveDocuments(docs: Document[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  } catch (_) {
    /* ignore storage errors */
  }
}

function isMobile(): boolean {
  return globalThis.matchMedia?.(MOBILE_QUERY).matches ?? false;
}

function preview(content: string): string {
  return content.trim().split("\n")[0] || "Empty note";
}

function countWords(content: string): number {
  return content.trim().split(/\s+/).filter(Boolean).length;
}

const Icon = ({ path }: { path: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d={path} />
  </svg>
);

const ICON_PANEL = "M3 5h18v14H3zM9 5v14";
const ICON_PLUS = "M12 5v14M5 12h14";
const ICON_CLOSE = "M6 6l12 12M18 6L6 18";

export default function NotesEditor() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loaded, setLoaded] = useState(false);
  /* null = layout default (open on desktop, closed on mobile), decided by CSS
     so the server render is already correct before hydration */
  const [panelOpen, setPanelOpen] = useState<boolean | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const docs = getStoredDocuments();
    setDocuments(docs);
    setActiveIndex(docs.length > 0 ? 0 : -1);
    setLoaded(true);
  }, []);

  const saveDocs = useCallback((next: Document[]) => {
    setDocuments(next);
    saveDocuments(next);
  }, []);

  const isPanelOpen = () => panelOpen ?? !isMobile();

  const togglePanel = () => setPanelOpen(!isPanelOpen());

  const closePanelOnMobile = () => {
    if (isMobile()) setPanelOpen(false);
  };

  const createDoc = useCallback(() => {
    const next = [...documents, { title: "", content: "" }];
    saveDocs(next);
    setActiveIndex(next.length - 1);
    closePanelOnMobile();
    setTimeout(() => titleInputRef.current?.focus(), 0);
  }, [documents, saveDocs]);

  const selectDoc = (index: number) => {
    setActiveIndex(index);
    closePanelOnMobile();
  };

  const deleteDoc = useCallback(
    (index: number) => {
      const doc = documents[index];
      if (
        doc.content.trim() &&
        !confirm(`Delete "${doc.title || "Untitled"}"?`)
      ) {
        return;
      }
      const next = documents.filter((_, i) => i !== index);
      saveDocs(next);
      if (next.length === 0) setActiveIndex(-1);
      else if (activeIndex >= index) {
        setActiveIndex(Math.max(0, activeIndex - 1));
      }
    },
    [documents, activeIndex, saveDocs],
  );

  const updateActive = useCallback(
    (patch: Partial<Document>) => {
      if (activeIndex < 0) return;
      saveDocs(
        documents.map((d, i) => i === activeIndex ? { ...d, ...patch } : d),
      );
    },
    [documents, activeIndex, saveDocs],
  );

  const active = activeIndex >= 0 ? documents[activeIndex] : undefined;
  const panelClass = panelOpen === null
    ? "notes-sidebar--auto"
    : panelOpen
    ? "notes-sidebar--open"
    : "notes-sidebar--closed";

  return (
    <div class="notes">
      <aside class={`notes-sidebar ${panelClass}`} aria-label="Notes">
        <div class="notes-sidebar-header">
          <a href="/" class="back-link notes-home">← Home</a>
          <button
            type="button"
            class="icon-btn"
            onClick={createDoc}
            title="New note"
            aria-label="New note"
          >
            <Icon path={ICON_PLUS} />
          </button>
        </div>
        <ul class="notes-list">
          {documents.map((doc, i) => (
            <li
              key={i}
              class={`notes-item${
                i === activeIndex ? " notes-item--active" : ""
              }`}
            >
              <button
                type="button"
                class="notes-item-select"
                onClick={() => selectDoc(i)}
                aria-current={i === activeIndex ? "true" : undefined}
              >
                <span class="notes-item-title">{doc.title || "Untitled"}</span>
                <span class="notes-item-preview">{preview(doc.content)}</span>
              </button>
              <button
                type="button"
                class="icon-btn icon-btn--sm notes-item-delete"
                onClick={() => deleteDoc(i)}
                title="Delete note"
                aria-label={`Delete ${doc.title || "Untitled"}`}
              >
                <Icon path={ICON_CLOSE} />
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <button
        type="button"
        class={`notes-backdrop ${panelClass}`}
        onClick={() => setPanelOpen(false)}
        aria-label="Close notes list"
        tabIndex={-1}
      />

      <section class="notes-editor">
        <div class="notes-toolbar">
          <button
            type="button"
            class="icon-btn"
            onClick={togglePanel}
            title="Toggle notes list"
            aria-label="Toggle notes list"
          >
            <Icon path={ICON_PANEL} />
          </button>
        </div>

        {loaded && (active
          ? (
            <div class="notes-page">
              <input
                ref={titleInputRef}
                type="text"
                class="notes-title"
                value={active.title}
                placeholder="Untitled"
                aria-label="Note title"
                onInput={(e) => updateActive({ title: e.currentTarget.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.parentElement
                      ?.querySelector("textarea")
                      ?.focus();
                  }
                }}
              />
              <textarea
                class="notes-body"
                value={active.content}
                placeholder="Start writing…"
                aria-label="Note content"
                spellcheck
                onInput={(e) =>
                  updateActive({ content: e.currentTarget.value })}
              />
            </div>
          )
          : (
            <div class="notes-empty">
              <p>No notes yet.</p>
              <button
                type="button"
                class="btn btn-secondary"
                onClick={createDoc}
              >
                New note
              </button>
            </div>
          ))}

        {active && (
          <p class="notes-status">
            {countWords(active.content)} words · {active.content.length}{" "}
            characters
          </p>
        )}
      </section>
    </div>
  );
}
