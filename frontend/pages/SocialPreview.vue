<script setup lang="ts">
import { Head } from "@inertiajs/vue3";
import PageLayout from "../components/PageLayout.vue";
import SocialPreview from "../components/SocialPreview.vue";
</script>

<template>
  <Head>
    <title>Social Preview - sl-utils 🛠️</title>
    <meta
      head-key="description"
      name="description"
      content="See how a link will look when shared on social networks"
    />
  </Head>

  <PageLayout
    title="Social Preview"
    subtitle="See how a link will look when shared on social networks"
    wide
  >
    <SocialPreview />
  </PageLayout>
</template>
