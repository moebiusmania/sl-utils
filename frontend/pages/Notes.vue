<script setup lang="ts">
import { Head } from "@inertiajs/vue3";
import NotesEditor from "../components/NotesEditor.vue";
</script>

<template>
  <Head>
    <title>Notes - sl-utils 🛠️</title>
    <meta
      head-key="description"
      name="description"
      content="A simple full-page notes editor with local storage"
    />
  </Head>

  <main>
    <NotesEditor />
  </main>
</template>
