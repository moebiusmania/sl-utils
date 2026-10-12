<script setup lang="ts">
import { Head } from "@inertiajs/vue3";
import PageLayout from "../components/PageLayout.vue";
</script>

<template>
  <Head>
    <title>404 - Page not found</title>
    <meta
      head-key="description"
      name="description"
      content="A collection of small utilities for myself 🤓"
    />
  </Head>

  <PageLayout
    title="404 - Page not found"
    subtitle="The page you were looking for doesn't exist."
  />
</template>
