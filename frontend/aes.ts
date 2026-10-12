const PBKDF2_ITERATIONS = 150_000;
const SALT_LENGTH_BYTES = 16;
const IV_LENGTH_BYTES = 12; // Recommended size for AES-GCM

function uint8ToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  // Using a slice ensures we pass exactly the view range (not an underlying
  // SharedArrayBuffer / ArrayBufferLike).
  const buffer = bytes.buffer as ArrayBuffer;
  return buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  // Encode bytes as a binary string before btoa.
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlEncode(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replaceAll("+", "-").replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecode(base64url: string): Uint8Array {
  let base64 = base64url.replaceAll("-", "+").replaceAll("_", "/");
  const padLength = base64.length % 4;
  if (padLength !== 0) base64 += "=".repeat(4 - padLength);
  return base64ToBytes(base64);
}

async function deriveAesKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
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

export async function encryptAes256Gcm(
  plaintext: string,
  passphrase: string,
): Promise<string> {
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

export async function decryptAes256Gcm(
  ciphertextText: string,
  passphrase: string,
): Promise<string> {
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
