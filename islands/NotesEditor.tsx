import { useState, useEffect, useCallback, useRef } from "preact/hooks";

const STORAGE_KEY = "sl-utils-notes";

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
        typeof (d as Document).content === "string"
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

export default function NotesEditor() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [panelOpen, setPanelOpen] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [editingTitleIndex, setEditingTitleIndex] = useState<number | null>(null);

  useEffect(() => {
    if (editingTitleIndex !== null) {
      const t = setTimeout(() => titleInputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [editingTitleIndex]);

  useEffect(() => {
    const docs = getStoredDocuments();
    setDocuments(docs);
    if (docs.length > 0 && activeIndex === -1) setActiveIndex(0);
    setIsDark(new URL(globalThis.location.href).searchParams.has("dark"));
  }, []);

  useEffect(() => {
    if (documents.length === 0) setActiveIndex(-1);
    else if (activeIndex >= documents.length) setActiveIndex(documents.length - 1);
  }, [documents.length, activeIndex]);

  const saveDocs = useCallback((next: Document[]) => {
    setDocuments(next);
    saveDocuments(next);
  }, []);

  const createDoc = useCallback(() => {
    const next = [...documents, { title: "Untitled", content: "" }];
    saveDocs(next);
    setActiveIndex(next.length - 1);
    setEditingTitleIndex(next.length - 1);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  }, [documents, saveDocs]);

  const deleteDoc = useCallback(
    (index: number) => {
      const next = documents.filter((_, i) => i !== index);
      saveDocs(next);
      if (activeIndex === index) setActiveIndex(Math.max(0, index - 1));
      else if (activeIndex > index) setActiveIndex(activeIndex - 1);
      setEditingTitleIndex(null);
    },
    [documents, activeIndex, saveDocs]
  );

  const selectDoc = useCallback((index: number) => {
    setActiveIndex(index);
    setEditingTitleIndex(null);
  }, []);

  const updateTitle = useCallback(
    (index: number, title: string) => {
      const next = documents.map((d, i) =>
        i === index ? { ...d, title: title.trim() || "Untitled" } : d
      );
      saveDocs(next);
      setEditingTitleIndex(null);
    },
    [documents, saveDocs]
  );

  const handleContentInput = useCallback(
    (e: Event) => {
      const target = e.target as HTMLTextAreaElement;
      if (activeIndex < 0) return;
      const next = documents.map((d, i) =>
        i === activeIndex ? { ...d, content: target.value } : d
      );
      saveDocs(next);
    },
    [documents, activeIndex, saveDocs]
  );

  const currentContent = activeIndex >= 0 ? documents[activeIndex]?.content ?? "" : "";
  const notesPath = "/notes";
  const notesPathDark = "/notes?dark";

  return (
    <div class="notes-layout">
      <aside class={`notes-sidebar ${panelOpen ? "notes-sidebar--open" : "notes-sidebar--collapsed"}`}>
        <div class="notes-sidebar-header">
          <button
            type="button"
            class="notes-panel-toggle"
            onClick={() => setPanelOpen((o) => !o)}
            title={panelOpen ? "Collapse panel" : "Expand panel"}
            aria-label={panelOpen ? "Collapse panel" : "Expand panel"}
          >
            {panelOpen ? "◀" : "▶"}
          </button>
          {panelOpen && <span class="notes-sidebar-title">Documents</span>}
        </div>
        {panelOpen && (
          <div class="notes-sidebar-body">
            <button type="button" class="notes-new-doc" onClick={createDoc}>
              + New document
            </button>
            <ul class="notes-doc-list">
              {documents.map((doc, i) => (
                <li
                  key={i}
                  class={`notes-doc-item ${i === activeIndex ? "notes-doc-item--active" : ""}`}
                >
                  <div class="notes-doc-row">
                    {editingTitleIndex === i ? (
                      <input
                        ref={titleInputRef}
                        type="text"
                        class="notes-doc-title-input"
                        value={doc.title}
                        onBlur={(e) => updateTitle(i, (e.target as HTMLInputElement).value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <button
                        type="button"
                        class="notes-doc-title-btn"
                        onClick={() => selectDoc(i)}
                        onDblClick={(e: Event) => {
                          e.preventDefault();
                          setEditingTitleIndex(i);
                        }}
                      >
                        <span class="notes-doc-title-text">{doc.title}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      class="notes-doc-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDoc(i);
                      }}
                      title="Delete document"
                      aria-label="Delete document"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
      <div class="notes-container">
        <textarea
          class="notes-textarea"
          value={currentContent}
          onInput={handleContentInput}
          placeholder={documents.length === 0 ? "Create a document from the panel →" : "Start typing..."}
          spellcheck
          disabled={activeIndex < 0}
        />
        <div class="notes-footer">
          <a href={isDark ? "/?dark" : "/"} class="back-link">
            ← Back home
          </a>
          <span class="notes-footer-sep"> · </span>
          <a href={isDark ? notesPath : notesPathDark} class="back-link">
            {isDark ? "Light mode" : "Dark mode"}
          </a>
        </div>
      </div>
    </div>
  );
}
