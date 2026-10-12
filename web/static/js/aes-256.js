const PBKDF2_ITERATIONS = 150_000;
const SALT_LENGTH_BYTES = 16;
const IV_LENGTH_BYTES = 12; // Recommended size for AES-GCM

function uint8ToArrayBuffer(bytes) {
  // Using a slice ensures we pass exactly the view range (not an underlying
  // SharedArrayBuffer / ArrayBufferLike).
  const buffer = bytes.buffer;
  return buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
}

function bytesToBase64(bytes) {
  // Encode bytes as a binary string before btoa.
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlEncode(bytes) {
  return bytesToBase64(bytes).replaceAll("+", "-").replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecode(base64url) {
  let base64 = base64url.replaceAll("-", "+").replaceAll("_", "/");
  const padLength = base64.length % 4;
  if (padLength !== 0) base64 += "=".repeat(4 - padLength);
  return base64ToBytes(base64);
}

async function deriveAesKeyFromPassphrase(
  passphrase,
  salt,
) {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj?.subtle) {
    throw new Error("Web Crypto API is not available.");
  }

  const passphraseKeyMaterial = await cryptoObj.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  return cryptoObj.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: uint8ToArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    passphraseKeyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptAes256Gcm(
  plaintext,
  passphrase,
) {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj?.getRandomValues) {
    throw new Error("Web Crypto API is not available.");
  }

  const salt = new Uint8Array(SALT_LENGTH_BYTES);
  const iv = new Uint8Array(IV_LENGTH_BYTES);
  cryptoObj.getRandomValues(salt);
  cryptoObj.getRandomValues(iv);

  const key = await deriveAesKeyFromPassphrase(passphrase, salt);
  const plaintextBytes = new TextEncoder().encode(plaintext);
  const ciphertextBuffer = await cryptoObj.subtle.encrypt(
    { name: "AES-GCM", iv: uint8ToArrayBuffer(iv) },
    key,
    uint8ToArrayBuffer(plaintextBytes),
  );

  return [
    base64UrlEncode(salt),
    base64UrlEncode(iv),
    base64UrlEncode(new Uint8Array(ciphertextBuffer)),
  ].join(".");
}

async function decryptAes256Gcm(
  ciphertextText,
  passphrase,
) {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj?.subtle) {
    throw new Error("Web Crypto API is not available.");
  }

  const parts = ciphertextText.trim().split(".");
  if (parts.length !== 3) {
    throw new Error(
      "Invalid ciphertext format. Expected: salt.iv.ciphertext (base64url).",
    );
  }

  const salt = base64UrlDecode(parts[0]);
  const iv = base64UrlDecode(parts[1]);
  const ciphertext = base64UrlDecode(parts[2]);

  const key = await deriveAesKeyFromPassphrase(passphrase, salt);
  const plaintextBuffer = await cryptoObj.subtle.decrypt(
    { name: "AES-GCM", iv: uint8ToArrayBuffer(iv) },
    key,
    uint8ToArrayBuffer(ciphertext),
  );

  return new TextDecoder().decode(plaintextBuffer);
}

document.addEventListener("alpine:init", () => {
  Alpine.data("aes256Cipher", () => ({
    tab: "encrypt",
    busy: false,
    error: "",

    clearSecretInputs() {
      // Clear both plaintext/ciphertext inputs + keys when switching tabs,
      // so we don't keep user-provided secret material in the DOM longer
      // than necessary.
      for (
        const name of [
          "encryptInput",
          "encryptKey",
          "encryptOutput",
          "decryptInput",
          "decryptKey",
          "decryptOutput",
        ]
      ) {
        if (this.$refs[name]) this.$refs[name].value = "";
      }
    },

    selectTab(next) {
      this.clearSecretInputs();
      this.error = "";
      this.tab = next;
    },

    async encrypt() {
      this.error = "";

      const plaintext = this.$refs.encryptInput?.value ?? "";
      const passphrase = this.$refs.encryptKey?.value ?? "";
      const outputEl = this.$refs.encryptOutput;

      if (!plaintext.trim()) {
        this.error = "Please enter text to encrypt.";
        return;
      }
      if (!passphrase) {
        this.error = "Please enter a secret key.";
        return;
      }
      if (!outputEl) return;

      this.busy = true;
      try {
        outputEl.value = await encryptAes256Gcm(plaintext, passphrase);
        // Do not keep the secret (or plaintext) around after success.
        this.$refs.encryptInput.value = "";
        this.$refs.encryptKey.value = "";
      } catch (err) {
        this.error = err instanceof Error ? err.message : "Encryption failed.";
      } finally {
        this.busy = false;
      }
    },

    async decrypt() {
      this.error = "";

      const ciphertextText = this.$refs.decryptInput?.value ?? "";
      const passphrase = this.$refs.decryptKey?.value ?? "";
      const outputEl = this.$refs.decryptOutput;

      if (!ciphertextText.trim()) {
        this.error = "Please paste ciphertext to decrypt.";
        return;
      }
      if (!passphrase) {
        this.error = "Please enter a secret key.";
        return;
      }
      if (!outputEl) return;

      this.busy = true;
      try {
        outputEl.value = await decryptAes256Gcm(ciphertextText, passphrase);
        // Do not keep the secret key (or ciphertext) around after success.
        this.$refs.decryptInput.value = "";
        this.$refs.decryptKey.value = "";
      } catch (_) {
        this.error =
          "Decryption failed. Check your secret key and ciphertext format.";
      } finally {
        this.busy = false;
      }
    },
  }));
});
