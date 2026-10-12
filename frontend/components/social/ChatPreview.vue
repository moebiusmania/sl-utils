<script setup lang="ts">
import PreviewImage from "./PreviewImage.vue";
import SocialFavicon from "./SocialFavicon.vue";
import { hostOf, type MetaPreview } from "./meta";

defineProps<{ meta: MetaPreview; variant: "slack" | "discord" }>();
</script>

<template>
  <div
    :class="`social-chat social-chat--${variant}`"
    :style="variant === 'discord' && meta.themeColor
      ? { borderLeftColor: meta.themeColor }
      : undefined"
  >
    <div class="social-chat-site">
      <SocialFavicon v-if="variant === 'slack'" :src="meta.favicon" />{{ meta.siteName || hostOf(meta.url) }}
    </div>
    <div class="social-chat-title">{{ meta.title }}</div>
    <div class="social-chat-desc social-clamp-3">{{ meta.description }}</div>
    <PreviewImage v-if="meta.image" :src="meta.image" image-class="social-chat-image" />
  </div>
</template>
