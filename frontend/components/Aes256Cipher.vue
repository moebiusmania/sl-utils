<script setup lang="ts">
import { ref } from "vue";
import { decryptAes256Gcm, encryptAes256Gcm } from "../aes";

type Tab = "encrypt" | "decrypt";

const tab = ref<Tab>("encrypt");
const busy = ref(false);
const error = ref("");

// Inputs are uncontrolled on purpose: secrets only live in the DOM
const encryptInput = ref<HTMLTextAreaElement | null>(null);
const encryptKey = ref<HTMLInputElement | null>(null);
const encryptOutput = ref<HTMLTextAreaElement | null>(null);

const decryptInput = ref<HTMLTextAreaElement | null>(null);
const decryptKey = ref<HTMLInputElement | null>(null);
const decryptOutput = ref<HTMLTextAreaElement | null>(null);

const clearSecretInputs = () => {
  // Clear both plaintext/ciphertext inputs + keys when switching tabs,
  // so we don't keep user-provided secret material in the DOM longer
  // than necessary.
  for (
    const el of [
      encryptInput,
      encryptKey,
      encryptOutput,
      decryptInput,
      decryptKey,
      decryptOutput,
    ]
  ) {
    if (el.value) el.value.value = "";
  }
};

const handleSelectTab = (next: Tab) => {
  clearSecretInputs();
  error.value = "";
  tab.value = next;
};

const handleEncrypt = async () => {
  error.value = "";

  const plaintext = encryptInput.value?.value ?? "";
  const passphrase = encryptKey.value?.value ?? "";
  const outputEl = encryptOutput.value;

  if (!plaintext.trim()) {
    error.value = "Please enter text to encrypt.";
    return;
  }
  if (!passphrase) {
    error.value = "Please enter a secret key.";
    return;
  }
  if (!outputEl) return;

  busy.value = true;
  try {
    outputEl.value = await encryptAes256Gcm(plaintext, passphrase);
    // Do not keep the secret (or plaintext) around after success.
    if (encryptInput.value) encryptInput.value.value = "";
    if (encryptKey.value) encryptKey.value.value = "";
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Encryption failed.";
  } finally {
    busy.value = false;
  }
};

const handleDecrypt = async () => {
  error.value = "";

  const ciphertextText = decryptInput.value?.value ?? "";
  const passphrase = decryptKey.value?.value ?? "";
  const outputEl = decryptOutput.value;

  if (!ciphertextText.trim()) {
    error.value = "Please paste ciphertext to decrypt.";
    return;
  }
  if (!passphrase) {
    error.value = "Please enter a secret key.";
    return;
  }
  if (!outputEl) return;

  busy.value = true;
  try {
    outputEl.value = await decryptAes256Gcm(ciphertextText, passphrase);
    // Do not keep the secret key (or ciphertext) around after success.
    if (decryptInput.value) decryptInput.value.value = "";
    if (decryptKey.value) decryptKey.value.value = "";
  } catch (_) {
    error.value =
      "Decryption failed. Check your secret key and ciphertext format.";
  } finally {
    busy.value = false;
  }
};
</script>

<template>
  <div class="tabs" role="tablist" aria-label="AES-256 mode">
    <button
      type="button"
      :class="`tab${tab === 'encrypt' ? ' tab--active' : ''}`"
      role="tab"
      :aria-selected="tab === 'encrypt'"
      @click="handleSelectTab('encrypt')"
    >
      Encrypt
    </button>
    <button
      type="button"
      :class="`tab${tab === 'decrypt' ? ' tab--active' : ''}`"
      role="tab"
      :aria-selected="tab === 'decrypt'"
      @click="handleSelectTab('decrypt')"
    >
      Decrypt
    </button>
  </div>

  <form v-if="tab === 'encrypt'" key="encrypt" class="form" @submit.prevent="handleEncrypt">
    <div class="form-group">
      <label class="form-label" for="aes-encrypt-input">Input text</label>
      <textarea
        ref="encryptInput"
        id="aes-encrypt-input"
        class="input input-textarea"
        placeholder="Type the text you want to encrypt..."
        spellcheck="true"
      />
    </div>

    <div class="form-group">
      <label class="form-label" for="aes-encrypt-key">Secret key</label>
      <input
        ref="encryptKey"
        id="aes-encrypt-key"
        type="password"
        class="input"
        placeholder="Enter secret key"
        autocomplete="off"
      />
    </div>

    <div class="form-group">
      <label class="form-label" for="aes-encrypt-output">Output text</label>
      <textarea
        ref="encryptOutput"
        id="aes-encrypt-output"
        class="input input-textarea input-mono"
        placeholder="Encrypted output will appear here..."
        readonly
      />
    </div>

    <p v-if="error" class="error-text">{{ error }}</p>

    <button type="submit" class="btn btn-primary btn-block" :disabled="busy">
      {{ busy ? "Encrypting..." : "Encrypt" }}
    </button>
  </form>

  <form v-else key="decrypt" class="form" @submit.prevent="handleDecrypt">
    <div class="form-group">
      <label class="form-label" for="aes-decrypt-input">Input text</label>
      <textarea
        ref="decryptInput"
        id="aes-decrypt-input"
        class="input input-textarea"
        placeholder="Paste salt.iv.ciphertext here..."
        spellcheck="false"
      />
    </div>

    <div class="form-group">
      <label class="form-label" for="aes-decrypt-key">Secret key</label>
      <input
        ref="decryptKey"
        id="aes-decrypt-key"
        type="password"
        class="input"
        placeholder="Enter secret key"
        autocomplete="off"
      />
    </div>

    <div class="form-group">
      <label class="form-label" for="aes-decrypt-output">Output text</label>
      <textarea
        ref="decryptOutput"
        id="aes-decrypt-output"
        class="input input-textarea input-mono"
        placeholder="Decrypted output will appear here..."
        readonly
      />
    </div>

    <p v-if="error" class="error-text">{{ error }}</p>

    <button type="submit" class="btn btn-primary btn-block" :disabled="busy">
      {{ busy ? "Decrypting..." : "Decrypt" }}
    </button>
  </form>
</template>
