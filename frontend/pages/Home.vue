<script setup lang="ts">
import { Head, Link } from "@inertiajs/vue3";
import CodeSpan from "../components/CodeSpan.vue";
import HeroHeader from "../components/HeroHeader.vue";
import SiteFooter from "../components/SiteFooter.vue";

defineProps<{
  pages: { path: string; title: string; description: string }[];
  endpoints: { endpoint: string; methods: string; description: string }[];
}>();
</script>

<template>
  <Head>
    <title>sl-utils 🛠️</title>
    <meta
      head-key="description"
      name="description"
      content="A collection of small utilities for myself 🤓"
    />
  </Head>

  <main class="index-main">
    <div class="index-container">
      <HeroHeader />
      <hr class="index-divider" />
      <table class="index-table">
        <thead>
          <tr>
            <th class="index-table-header">Page</th>
            <th class="index-table-header">Description</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="page in pages" :key="page.path">
            <td class="index-table-cell">
              <CodeSpan><Link :href="page.path">{{ page.title }}</Link></CodeSpan>
            </td>
            <td class="index-table-cell">{{ page.description }}</td>
          </tr>
        </tbody>
      </table>
      <hr class="index-divider" />
      <table class="index-table">
        <thead>
          <tr>
            <th class="index-table-header">Endpoint</th>
            <th class="index-table-header">Methods</th>
            <th class="index-table-header">Description</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in endpoints" :key="item.endpoint">
            <td class="index-table-cell">
              <CodeSpan><a :href="item.endpoint">{{ item.endpoint }}</a></CodeSpan>
            </td>
            <td class="index-table-cell">{{ item.methods }}</td>
            <td class="index-table-cell">{{ item.description }}</td>
          </tr>
        </tbody>
      </table>
      <hr class="index-divider" />
      <SiteFooter />
    </div>
  </main>
</template>
