<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import { Link } from "@inertiajs/vue3";
import NoteIcon from "./NoteIcon.vue";

const STORAGE_KEY = "sl-utils-notes";
const MOBILE_QUERY = "(max-width: 767px)";

type Document = { title: string; content: string };

function getStoredDocuments(): Document[] {
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

const ICON_PANEL = "M3 5h18v14H3zM9 5v14";
const ICON_PLUS = "M12 5v14M5 12h14";
const ICON_CLOSE = "M6 6l12 12M18 6L6 18";

const documents = ref<Document[]>([]);
const activeIndex = ref(-1);
const loaded = ref(false);
/* null = layout default (open on desktop, closed on mobile), decided by CSS
   so the server render is already correct before hydration */
const panelOpen = ref<boolean | null>(null);
const titleInput = ref<HTMLInputElement | null>(null);

onMounted(() => {
  const docs = getStoredDocuments();
  documents.value = docs;
  activeIndex.value = docs.length > 0 ? 0 : -1;
  loaded.value = true;
});

const saveDocs = (next: Document[]) => {
  documents.value = next;
  saveDocuments(next);
};

const isPanelOpen = () => panelOpen.value ?? !isMobile();

const togglePanel = () => {
  panelOpen.value = !isPanelOpen();
};

const closePanelOnMobile = () => {
  if (isMobile()) panelOpen.value = false;
};

const createDoc = () => {
  const next = [...documents.value, { title: "", content: "" }];
  saveDocs(next);
  activeIndex.value = next.length - 1;
  closePanelOnMobile();
  nextTick(() => titleInput.value?.focus());
};

const selectDoc = (index: number) => {
  activeIndex.value = index;
  closePanelOnMobile();
};

const deleteDoc = (index: number) => {
  const doc = documents.value[index];
  if (
    doc.content.trim() &&
    !confirm(`Delete "${doc.title || "Untitled"}"?`)
  ) {
    return;
  }
  const next = documents.value.filter((_, i) => i !== index);
  saveDocs(next);
  if (next.length === 0) activeIndex.value = -1;
  else if (activeIndex.value >= index) {
    activeIndex.value = Math.max(0, activeIndex.value - 1);
  }
};

const updateActive = (patch: Partial<Document>) => {
  if (activeIndex.value < 0) return;
  saveDocs(
    documents.value.map((d, i) =>
      i === activeIndex.value ? { ...d, ...patch } : d
    ),
  );
};

const focusBody = (e: KeyboardEvent) => {
  if (e.key === "Enter") {
    e.preventDefault();
    (e.currentTarget as HTMLElement).parentElement
      ?.querySelector("textarea")
      ?.focus();
  }
};

const active = computed(() =>
  activeIndex.value >= 0 ? documents.value[activeIndex.value] : undefined
);
const panelClass = computed(() =>
  panelOpen.value === null
    ? "notes-sidebar--auto"
    : panelOpen.value
    ? "notes-sidebar--open"
    : "notes-sidebar--closed"
);
</script>

<template>
  <div class="notes">
    <aside :class="`notes-sidebar ${panelClass}`" aria-label="Notes">
      <div class="notes-sidebar-header">
        <Link href="/" class="back-link notes-home">← Home</Link>
        <button
          type="button"
          class="icon-btn"
          title="New note"
          aria-label="New note"
          @click="createDoc"
        >
          <NoteIcon :path="ICON_PLUS" />
        </button>
      </div>
      <ul class="notes-list">
        <li
          v-for="(doc, i) in documents"
          :key="i"
          :class="`notes-item${i === activeIndex ? ' notes-item--active' : ''}`"
        >
          <button
            type="button"
            class="notes-item-select"
            :aria-current="i === activeIndex ? 'true' : undefined"
            @click="selectDoc(i)"
          >
            <span class="notes-item-title">{{ doc.title || "Untitled" }}</span>
            <span class="notes-item-preview">{{ preview(doc.content) }}</span>
          </button>
          <button
            type="button"
            class="icon-btn icon-btn--sm notes-item-delete"
            title="Delete note"
            :aria-label="`Delete ${doc.title || 'Untitled'}`"
            @click="deleteDoc(i)"
          >
            <NoteIcon :path="ICON_CLOSE" />
          </button>
        </li>
      </ul>
    </aside>

    <button
      type="button"
      :class="`notes-backdrop ${panelClass}`"
      aria-label="Close notes list"
      tabindex="-1"
      @click="panelOpen = false"
    />

    <section class="notes-editor">
      <div class="notes-toolbar">
        <button
          type="button"
          class="icon-btn"
          title="Toggle notes list"
          aria-label="Toggle notes list"
          @click="togglePanel"
        >
          <NoteIcon :path="ICON_PANEL" />
        </button>
      </div>

      <template v-if="loaded">
        <div v-if="active" class="notes-page">
          <input
            ref="titleInput"
            type="text"
            class="notes-title"
            :value="active.title"
            placeholder="Untitled"
            aria-label="Note title"
            @input="updateActive({ title: ($event.currentTarget as HTMLInputElement).value })"
            @keydown="focusBody"
          />
          <textarea
            class="notes-body"
            :value="active.content"
            placeholder="Start writing…"
            aria-label="Note content"
            spellcheck="true"
            @input="updateActive({ content: ($event.currentTarget as HTMLTextAreaElement).value })"
          />
        </div>
        <div v-else class="notes-empty">
          <p>No notes yet.</p>
          <button type="button" class="btn btn-secondary" @click="createDoc">
            New note
          </button>
        </div>
      </template>

      <p v-if="active" class="notes-status">
        {{ countWords(active.content) }} words · {{ active.content.length }} characters
      </p>
    </section>
  </div>
</template>
