<script setup lang="ts">
import { Head } from "@inertiajs/vue3";
import PageLayout from "../components/PageLayout.vue";
import CountdownTimer from "../components/CountdownTimer.vue";
</script>

<template>
  <Head>
    <title>Countdown Timer - sl-utils 🛠️</title>
    <meta
      head-key="description"
      name="description"
      content="A simple countdown timer with minutes and seconds"
    />
  </Head>

  <PageLayout
    title="Countdown Timer"
    subtitle="Set minutes and seconds, then start the countdown"
    wide
  >
    <CountdownTimer />
  </PageLayout>
</template>
