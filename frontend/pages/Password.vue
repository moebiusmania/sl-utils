<script setup lang="ts">
import { Head } from "@inertiajs/vue3";
import PageLayout from "../components/PageLayout.vue";
import PasswordGenerator from "../components/PasswordGenerator.vue";
</script>

<template>
  <Head>
    <title>Password Generator - sl-utils 🛠️</title>
    <meta
      head-key="description"
      name="description"
      content="Generate secure passwords with customizable options"
    />
  </Head>

  <PageLayout
    title="Password Generator"
    subtitle="Create secure passwords with customizable options"
  >
    <PasswordGenerator />
  </PageLayout>
</template>
