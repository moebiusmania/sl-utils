<script setup lang="ts">
import { ref } from "vue";
import { isValidUrl } from "../url";

const url = ref("");
const qrCodeSvg = ref("");
const isGenerating = ref(false);
const error = ref("");

const handleSubmit = async () => {
  if (!url.value.trim()) {
    error.value = "Please enter a URL";
    return;
  }

  isGenerating.value = true;
  error.value = "";
  qrCodeSvg.value = "";

  try {
    const params = new URLSearchParams();
    params.append("url", url.value.trim());

    const response = await fetch(`/api/qr-code?${params.toString()}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    qrCodeSvg.value = await response.text();
  } catch (err) {
    console.error("Error generating QR code:", err);
    error.value = err instanceof Error
      ? err.message
      : "Failed to generate QR code";
  } finally {
    isGenerating.value = false;
  }
};

const downloadQRCode = () => {
  if (qrCodeSvg.value) {
    const blob = new Blob([qrCodeSvg.value], { type: "image/svg+xml" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = "qrcode.svg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(href);
  }
};

const onInput = (e: Event) => {
  url.value = (e.currentTarget as HTMLInputElement).value;
  error.value = "";
};
</script>

<template>
  <form class="form" @submit.prevent="handleSubmit">
    <div class="form-group">
      <label class="form-label" for="url">URL</label>
      <input
        type="url"
        id="url"
        class="input"
        placeholder="https://example.com"
        :value="url"
        @input="onInput"
      />
      <p v-if="url && !isValidUrl(url)" class="error-text">Please enter a valid URL</p>
    </div>

    <p v-if="error" class="error-text">{{ error }}</p>

    <button
      type="submit"
      class="btn btn-primary btn-block"
      :disabled="isGenerating || !url.trim() || !isValidUrl(url)"
    >
      {{ isGenerating ? "Generating..." : "Generate QR code" }}
    </button>
  </form>

  <div v-if="qrCodeSvg" class="result result--center">
    <div class="qr-code">
      <img
        :src="`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrCodeSvg)}`"
        alt="Generated QR code"
      />
    </div>
    <p class="qr-info">Scan to visit <span class="code-span">{{ url }}</span></p>
    <button
      type="button"
      class="btn btn-secondary"
      title="Download QR code as SVG"
      @click="downloadQRCode"
    >
      Download SVG
    </button>
  </div>
</template>
