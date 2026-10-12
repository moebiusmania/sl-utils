<script setup lang="ts">
import { computed } from "vue";

const IMPORTANT_TAGS = [
  "<title>",
  "description",
  "og:title",
  "og:description",
  "og:image",
  "og:url",
  "og:type",
  "og:site_name",
  "twitter:card",
  "twitter:title",
  "twitter:description",
  "twitter:image",
];

const props = defineProps<{ tags: Record<string, string> }>();

const keys = computed(() => {
  const others = Object.keys(props.tags)
    .filter((k) =>
      !IMPORTANT_TAGS.includes(k) && /^(og|twitter|article|fb):/.test(k)
    )
    .sort();
  return [...IMPORTANT_TAGS, ...others];
});
</script>

<template>
  <table class="social-tags">
    <tbody>
      <tr v-for="key in keys" :key="key">
        <td class="social-tags-key">{{ key }}</td>
        <td class="social-tags-value">
          <template v-if="tags[key] != null">{{ tags[key] }}</template>
          <span v-else class="social-missing">missing</span>
        </td>
      </tr>
    </tbody>
  </table>
</template>
