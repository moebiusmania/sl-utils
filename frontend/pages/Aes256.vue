<script setup lang="ts">
import { Head } from "@inertiajs/vue3";
import PageLayout from "../components/PageLayout.vue";
import Aes256Cipher from "../components/Aes256Cipher.vue";
</script>

<template>
  <Head>
    <title>AES-256 Encrypt/Decrypt - sl-utils 🛠️</title>
    <meta
      head-key="description"
      name="description"
      content="Encrypt/decrypt text with AES-256 in the browser"
    />
  </Head>

  <PageLayout title="AES-256 Encrypt / Decrypt" wide>
    <template #subtitle>Everything runs locally in your browser. Output format: <span class="code-span">salt.iv.ciphertext</span></template>
    <Aes256Cipher />
  </PageLayout>
</template>
