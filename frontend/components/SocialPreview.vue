<script setup lang="ts">
import { ref } from "vue";
import { isValidUrl } from "../url";
import type { MetaPreview } from "./social/meta";
import ChatPreview from "./social/ChatPreview.vue";
import FacebookPreview from "./social/FacebookPreview.vue";
import GooglePreview from "./social/GooglePreview.vue";
import LinkedInPreview from "./social/LinkedInPreview.vue";
import TagsTable from "./social/TagsTable.vue";
import XPreview from "./social/XPreview.vue";

const url = ref("");
const meta = ref<MetaPreview | null>(null);
const isLoading = ref(false);
const error = ref("");

const handleSubmit = async () => {
  if (!url.value.trim()) {
    error.value = "Please enter a URL";
    return;
  }

  isLoading.value = true;
  error.value = "";
  meta.value = null;

  try {
    const params = new URLSearchParams();
    params.append("url", url.value.trim());

    const response = await fetch(`/api/meta?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "Failed to load page metadata");
    }

    meta.value = data;
  } catch (err) {
    console.error("Error loading metadata:", err);
    error.value = err instanceof Error
      ? err.message
      : "Failed to load metadata";
  } finally {
    isLoading.value = false;
  }
};

const onInput = (e: Event) => {
  url.value = (e.currentTarget as HTMLInputElement).value;
  error.value = "";
};
</script>

<template>
  <form class="form" @submit.prevent="handleSubmit">
    <div class="form-group">
      <label class="form-label" for="url">URL</label>
      <input
        type="url"
        id="url"
        class="input"
        placeholder="https://example.com"
        :value="url"
        @input="onInput"
      />
      <p v-if="url && !isValidUrl(url)" class="error-text">Please enter a valid URL</p>
    </div>

    <p v-if="error" class="error-text">{{ error }}</p>

    <button
      type="submit"
      class="btn btn-primary btn-block"
      :disabled="isLoading || !url.trim() || !isValidUrl(url)"
    >
      {{ isLoading ? "Loading..." : "Preview" }}
    </button>
  </form>

  <div v-if="meta" class="social-results">
    <section class="social-section">
      <h2 class="social-section-title">Google</h2>
      <GooglePreview :meta="meta" />
    </section>
    <section class="social-section">
      <h2 class="social-section-title">X / Twitter</h2>
      <XPreview :meta="meta" />
    </section>
    <section class="social-section">
      <h2 class="social-section-title">Facebook</h2>
      <FacebookPreview :meta="meta" />
    </section>
    <section class="social-section">
      <h2 class="social-section-title">LinkedIn</h2>
      <LinkedInPreview :meta="meta" />
    </section>
    <section class="social-section">
      <h2 class="social-section-title">Slack</h2>
      <ChatPreview :meta="meta" variant="slack" />
    </section>
    <section class="social-section">
      <h2 class="social-section-title">Discord</h2>
      <ChatPreview :meta="meta" variant="discord" />
    </section>
    <section class="social-section">
      <h2 class="social-section-title">Detected tags</h2>
      <TagsTable :tags="meta.tags" />
    </section>
  </div>
</template>
