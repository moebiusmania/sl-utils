<script setup lang="ts">
import { ref } from "vue";

defineProps<{ src: string }>();
const failed = ref(false);
</script>

<template>
  <span v-if="!src || failed" class="social-favicon" />
  <img
    v-else
    class="social-favicon"
    :src="src"
    alt=""
    referrerpolicy="no-referrer"
    @error="failed = true"
  />
</template>
