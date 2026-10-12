<script setup lang="ts">
import { computed } from "vue";
import SocialFavicon from "./SocialFavicon.vue";
import { hostOf, type MetaPreview, truncate } from "./meta";

const props = defineProps<{ meta: MetaPreview }>();
const url = computed(() => new URL(props.meta.url));
const crumbs = computed(() =>
  url.value.pathname.split("/").filter(Boolean).join(" › ")
);
</script>

<template>
  <div class="social-google">
    <div class="social-google-site">
      <SocialFavicon :src="meta.favicon" />
      <div>
        <div class="social-google-name">{{ meta.siteName || hostOf(meta.url) }}</div>
        <div class="social-google-url">{{ url.origin }}{{ crumbs ? ` › ${crumbs}` : "" }}</div>
      </div>
    </div>
    <div class="social-google-title">{{ truncate(meta.title, 60) }}</div>
    <div class="social-google-desc">{{ truncate(meta.description, 160) }}</div>
  </div>
</template>
