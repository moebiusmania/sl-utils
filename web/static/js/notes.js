const NOTES_STORAGE_KEY = "sl-utils-notes";
const MOBILE_QUERY = "(max-width: 767px)";

function getStoredDocuments() {
  try {
    const raw = localStorage.getItem(NOTES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    /* Migrate from old single-string format */
    if (typeof parsed === "string") {
      return [{ title: "Notes", content: parsed }];
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (d) =>
        d !== null &&
        typeof d === "object" &&
        "title" in d &&
        "content" in d &&
        typeof d.title === "string" &&
        typeof d.content === "string",
    );
  } catch (_) {
    return [];
  }
}

function saveDocuments(docs) {
  try {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(docs));
  } catch (_) {
    /* ignore storage errors */
  }
}

function isMobile() {
  return globalThis.matchMedia?.(MOBILE_QUERY).matches ?? false;
}

document.addEventListener("alpine:init", () => {
  Alpine.data("notesEditor", () => ({
    documents: [],
    activeIndex: -1,
    loaded: false,
    /* null = layout default (open on desktop, closed on mobile), decided by
       CSS so the server render is already correct */
    panelOpen: null,

    init() {
      this.documents = getStoredDocuments();
      this.activeIndex = this.documents.length > 0 ? 0 : -1;
      this.loaded = true;
    },

    get active() {
      return this.activeIndex >= 0 ? this.documents[this.activeIndex] : undefined;
    },

    get panelClasses() {
      return {
        "notes-sidebar--auto": this.panelOpen === null,
        "notes-sidebar--open": this.panelOpen === true,
        "notes-sidebar--closed": this.panelOpen === false,
      };
    },

    preview(content) {
      return content.trim().split("\n")[0] || "Empty note";
    },

    countWords(content) {
      return content.trim().split(/\s+/).filter(Boolean).length;
    },

    saveDocs(next) {
      this.documents = next;
      saveDocuments(next);
    },

    togglePanel() {
      this.panelOpen = !(this.panelOpen ?? !isMobile());
    },

    closePanelOnMobile() {
      if (isMobile()) this.panelOpen = false;
    },

    createDoc() {
      const next = [...this.documents, { title: "", content: "" }];
      this.saveDocs(next);
      this.activeIndex = next.length - 1;
      this.closePanelOnMobile();
      setTimeout(() => document.querySelector(".notes-title")?.focus(), 0);
    },

    selectDoc(index) {
      this.activeIndex = index;
      this.closePanelOnMobile();
    },

    deleteDoc(index) {
      const doc = this.documents[index];
      if (
        doc.content.trim() &&
        !confirm(`Delete "${doc.title || "Untitled"}"?`)
      ) {
        return;
      }
      const next = this.documents.filter((_, i) => i !== index);
      this.saveDocs(next);
      if (next.length === 0) this.activeIndex = -1;
      else if (this.activeIndex >= index) {
        this.activeIndex = Math.max(0, this.activeIndex - 1);
      }
    },

    updateActive(patch) {
      if (this.activeIndex < 0) return;
      this.saveDocs(
        this.documents.map((d, i) =>
          i === this.activeIndex ? { ...d, ...patch } : d
        ),
      );
    },
  }));
});
