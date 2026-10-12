<script setup lang="ts">
import { Head } from "@inertiajs/vue3";
import PageLayout from "../components/PageLayout.vue";
import QRCodeGenerator from "../components/QRCodeGenerator.vue";
</script>

<template>
  <Head>
    <title>QR Code Generator - sl-utils 🛠️</title>
    <meta
      head-key="description"
      name="description"
      content="Generate QR codes for any URL quickly and easily"
    />
  </Head>

  <PageLayout
    title="QR Code Generator"
    subtitle="Generate QR codes for any URL quickly and easily"
  >
    <QRCodeGenerator />
  </PageLayout>
</template>
