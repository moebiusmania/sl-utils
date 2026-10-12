<script setup lang="ts">
import PreviewImage from "./PreviewImage.vue";
import { hostOf, type MetaPreview, truncate } from "./meta";

defineProps<{ meta: MetaPreview }>();
</script>

<template>
  <div v-if="meta.twitterCard === 'summary'" class="social-x social-x--small">
    <PreviewImage :src="meta.image" image-class="social-x-thumb" />
    <div class="social-x-body">
      <div class="social-muted">{{ hostOf(meta.url) }}</div>
      <div class="social-x-title">{{ meta.title }}</div>
      <div class="social-muted social-clamp-2">{{ meta.description }}</div>
    </div>
  </div>
  <div v-else class="social-x">
    <div class="social-x-large">
      <PreviewImage :src="meta.image" image-class="social-image" />
      <span class="social-x-overlay">{{ truncate(meta.title, 70) }}</span>
    </div>
    <div class="social-muted social-x-from">From {{ hostOf(meta.url) }}</div>
  </div>
</template>
