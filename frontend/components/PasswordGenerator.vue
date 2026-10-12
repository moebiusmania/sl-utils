<script setup lang="ts">
import { reactive, ref } from "vue";

interface PasswordOptions {
  length: number;
  numbers: boolean;
  symbols: boolean;
  lowercase: boolean;
  uppercase: boolean;
}

type CharacterType = Exclude<keyof PasswordOptions, "length">;

const options = reactive<PasswordOptions>({
  length: 12,
  numbers: true,
  symbols: true,
  lowercase: true,
  uppercase: true,
});

const generatedPassword = ref("");
const isGenerating = ref(false);
const copied = ref(false);

const handleSubmit = async () => {
  isGenerating.value = true;
  copied.value = false;

  try {
    const params = new URLSearchParams();
    params.append("length", options.length.toString());
    // The API enables every set unless it is explicitly "false"
    params.append("numbers", String(options.numbers));
    params.append("symbols", String(options.symbols));
    params.append("lowercase", String(options.lowercase));
    params.append("uppercase", String(options.uppercase));

    const response = await fetch(`/api/password?${params.toString()}`);
    generatedPassword.value = await response.text();
  } catch (error) {
    console.error("Error generating password:", error);
  } finally {
    isGenerating.value = false;
  }
};

const copyToClipboard = async () => {
  if (generatedPassword.value) {
    try {
      await navigator.clipboard.writeText(generatedPassword.value);
      copied.value = true;
      setTimeout(() => (copied.value = false), 2000);
    } catch (error) {
      console.error("Failed to copy password:", error);
    }
  }
};

const characterTypes: { key: CharacterType; label: string }[] = [
  { key: "lowercase", label: "Lowercase (a-z)" },
  { key: "uppercase", label: "Uppercase (A-Z)" },
  { key: "numbers", label: "Numbers (0-9)" },
  { key: "symbols", label: "Symbols (!@#$...)" },
];
</script>

<template>
  <form class="form" @submit.prevent="handleSubmit">
    <div class="form-group">
      <label class="form-label" for="length">Length: {{ options.length }}</label>
      <input
        type="range"
        id="length"
        class="form-range"
        min="4"
        max="128"
        :value="options.length"
        @input="options.length = parseInt(($event.currentTarget as HTMLInputElement).value)"
      />
      <div class="range-labels">
        <span>4</span>
        <span>128</span>
      </div>
    </div>

    <fieldset class="form-group">
      <legend class="form-label">Character types</legend>
      <div class="checkbox-grid">
        <label v-for="{ key, label } in characterTypes" :key="key" class="checkbox-label">
          <input
            type="checkbox"
            :checked="options[key]"
            @change="options[key] = ($event.currentTarget as HTMLInputElement).checked"
          />{{ label }}
        </label>
      </div>
    </fieldset>

    <button
      type="submit"
      class="btn btn-primary btn-block"
      :disabled="isGenerating ||
        (!options.lowercase && !options.uppercase && !options.numbers &&
          !options.symbols)"
    >
      {{ isGenerating ? "Generating..." : "Generate password" }}
    </button>
  </form>

  <div v-if="generatedPassword" class="result">
    <span class="form-label">Generated password</span>
    <div class="output-row">
      <code class="output-text">{{ generatedPassword }}</code>
      <button
        type="button"
        class="btn btn-secondary"
        title="Copy to clipboard"
        @click="copyToClipboard"
      >
        {{ copied ? "✓ Copied" : "Copy" }}
      </button>
    </div>
  </div>
</template>
