<script setup lang="ts">
import { Link } from "@inertiajs/vue3";

const { wide = false } = defineProps<{
  title: string;
  subtitle?: string;
  wide?: boolean;
}>();
</script>

<template>
  <main class="page">
    <div :class="`page-container${wide ? ' page-container--wide' : ''}`">
      <header class="page-header">
        <h1 class="page-title">{{ title }}</h1>
        <p v-if="subtitle || $slots.subtitle" class="page-subtitle">
          <slot name="subtitle">{{ subtitle }}</slot>
        </p>
      </header>
      <slot />
      <footer class="page-footer">
        <Link href="/" class="back-link">← Back home</Link>
      </footer>
    </div>
  </main>
</template>
