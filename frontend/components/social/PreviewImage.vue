<script setup lang="ts">
import { ref } from "vue";

defineProps<{ src: string; imageClass: string }>();
const failed = ref(false);
</script>

<template>
  <div v-if="!src || failed" :class="`${imageClass} social-image--empty`">No image</div>
  <img
    v-else
    :class="imageClass"
    :src="src"
    alt=""
    referrerpolicy="no-referrer"
    loading="lazy"
    @error="failed = true"
  />
</template>
