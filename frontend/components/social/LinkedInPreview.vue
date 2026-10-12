<script setup lang="ts">
import PreviewImage from "./PreviewImage.vue";
import { hostOf, type MetaPreview } from "./meta";

defineProps<{ meta: MetaPreview }>();
</script>

<template>
  <div class="social-card social-linkedin">
    <PreviewImage :src="meta.image" image-class="social-image" />
    <div class="social-card-body">
      <div class="social-card-title social-clamp-2">{{ meta.title }}</div>
      <div class="social-muted">{{ hostOf(meta.url) }}</div>
    </div>
  </div>
</template>
