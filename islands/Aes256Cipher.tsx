import { useEffect, useRef, useState } from "preact/hooks";

type Tab = "encrypt" | "decrypt";

const PBKDF2_ITERATIONS = 150_000;
const SALT_LENGTH_BYTES = 16;
const IV_LENGTH_BYTES = 12; // Recommended size for AES-GCM

function uint8ToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  // WebCrypto typings in Deno can be strict about BufferSource/ArrayBuffer types.
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

async function encryptAes256Gcm(
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

async function decryptAes256Gcm(
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

export default function Aes256Cipher() {
  const [tab, setTab] = useState<Tab>("encrypt");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");
  const [isDark, setIsDark] = useState(false);

  const encryptInputRef = useRef<HTMLTextAreaElement>(null);
  const encryptKeyRef = useRef<HTMLInputElement>(null);
  const encryptOutputRef = useRef<HTMLTextAreaElement>(null);

  const decryptInputRef = useRef<HTMLTextAreaElement>(null);
  const decryptKeyRef = useRef<HTMLInputElement>(null);
  const decryptOutputRef = useRef<HTMLTextAreaElement>(null);

  const clearSecretInputs = () => {
    // Clear both plaintext/ciphertext inputs + keys when switching tabs,
    // so we don't keep user-provided secret material in the DOM longer
    // than necessary.
    if (encryptInputRef.current) encryptInputRef.current.value = "";
    if (encryptKeyRef.current) encryptKeyRef.current.value = "";
    if (encryptOutputRef.current) encryptOutputRef.current.value = "";
    if (decryptInputRef.current) decryptInputRef.current.value = "";
    if (decryptKeyRef.current) decryptKeyRef.current.value = "";
    if (decryptOutputRef.current) decryptOutputRef.current.value = "";
  };

  const handleSelectTab = (next: Tab) => {
    clearSecretInputs();
    setError("");
    setTab(next);
  };

  useEffect(() => {
    const href = globalThis.location?.href;
    if (href) setIsDark(new URL(href).searchParams.has("dark"));
  }, []);

  const handleEncrypt = async (e: Event) => {
    e.preventDefault();
    setError("");

    const plaintext = encryptInputRef.current?.value ?? "";
    const passphrase = encryptKeyRef.current?.value ?? "";
    const outputEl = encryptOutputRef.current;

    if (!plaintext.trim()) {
      setError("Please enter text to encrypt.");
      return;
    }
    if (!passphrase) {
      setError("Please enter a secret key.");
      return;
    }
    if (!outputEl) return;

    setBusy(true);
    try {
      const encrypted = await encryptAes256Gcm(plaintext, passphrase);
      outputEl.value = encrypted;
      // Do not keep the secret (or plaintext) around after success.
      if (encryptInputRef.current) encryptInputRef.current.value = "";
      if (encryptKeyRef.current) encryptKeyRef.current.value = "";
    } catch (err) {
      const message = err instanceof Error ? err.message : "Encryption failed.";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const handleDecrypt = async (e: Event) => {
    e.preventDefault();
    setError("");

    const ciphertextText = decryptInputRef.current?.value ?? "";
    const passphrase = decryptKeyRef.current?.value ?? "";
    const outputEl = decryptOutputRef.current;

    if (!ciphertextText.trim()) {
      setError("Please paste ciphertext to decrypt.");
      return;
    }
    if (!passphrase) {
      setError("Please enter a secret key.");
      return;
    }
    if (!outputEl) return;

    setBusy(true);
    try {
      const plaintext = await decryptAes256Gcm(ciphertextText, passphrase);
      outputEl.value = plaintext;
      // Do not keep the secret key (or ciphertext) around after success.
      if (decryptInputRef.current) decryptInputRef.current.value = "";
      if (decryptKeyRef.current) decryptKeyRef.current.value = "";
    } catch (_) {
      setError(
        "Decryption failed. Check your secret key and ciphertext format.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="aes-main">
      <div class="aes-container">
        <header class="aes-header">
          <h1 class="aes-title">AES-256 Encrypt / Decrypt</h1>
          <p class="aes-subtitle">
            Everything runs locally in your browser. Output format:{" "}
            <span class="aes-code">salt.iv.ciphertext</span>
          </p>
        </header>

        <div class="aes-tabs" role="tablist" aria-label="AES-256 mode">
          <button
            type="button"
            class={`aes-tab-button${
              tab === "encrypt" ? " aes-tab-button--active" : ""
            }`}
            role="tab"
            aria-selected={tab === "encrypt"}
            onClick={() => handleSelectTab("encrypt")}
          >
            Encrypt
          </button>
          <button
            type="button"
            class={`aes-tab-button${
              tab === "decrypt" ? " aes-tab-button--active" : ""
            }`}
            role="tab"
            aria-selected={tab === "decrypt"}
            onClick={() => handleSelectTab("decrypt")}
          >
            Decrypt
          </button>
        </div>

        {tab === "encrypt"
          ? (
            <form class="aes-form" onSubmit={handleEncrypt}>
              <div class="form-group">
                <label class="form-label" htmlFor="aes-encrypt-input">
                  Input text
                </label>
                <textarea
                  ref={encryptInputRef}
                  id="aes-encrypt-input"
                  class="aes-textarea"
                  placeholder="Type the text you want to encrypt..."
                  spellcheck
                  defaultValue=""
                />
              </div>

              <div class="form-group">
                <label class="form-label" htmlFor="aes-encrypt-key">
                  Secret key
                </label>
                <input
                  ref={encryptKeyRef}
                  id="aes-encrypt-key"
                  type="password"
                  class="input-field"
                  placeholder="Enter secret key"
                  autoComplete="off"
                  defaultValue=""
                />
              </div>

              <div class="form-group">
                <label class="form-label" htmlFor="aes-encrypt-output">
                  Output text
                </label>
                <textarea
                  ref={encryptOutputRef}
                  id="aes-encrypt-output"
                  class="aes-textarea aes-output"
                  placeholder="Encrypted output will appear here..."
                  readOnly
                  defaultValue=""
                />
              </div>

              {error && <div class="input-error">{error}</div>}

              <button
                type="submit"
                class="generate-button"
                disabled={busy}
              >
                {busy ? "Encrypting..." : "Encrypt"}
              </button>
            </form>
          )
          : (
            <form class="aes-form" onSubmit={handleDecrypt}>
              <div class="form-group">
                <label class="form-label" htmlFor="aes-decrypt-input">
                  Input text
                </label>
                <textarea
                  ref={decryptInputRef}
                  id="aes-decrypt-input"
                  class="aes-textarea"
                  placeholder="Paste salt.iv.ciphertext here..."
                  spellcheck={false}
                  defaultValue=""
                />
              </div>

              <div class="form-group">
                <label class="form-label" htmlFor="aes-decrypt-key">
                  Secret key
                </label>
                <input
                  ref={decryptKeyRef}
                  id="aes-decrypt-key"
                  type="password"
                  class="input-field"
                  placeholder="Enter secret key"
                  autoComplete="off"
                  defaultValue=""
                />
              </div>

              <div class="form-group">
                <label class="form-label" htmlFor="aes-decrypt-output">
                  Output text
                </label>
                <textarea
                  ref={decryptOutputRef}
                  id="aes-decrypt-output"
                  class="aes-textarea aes-output"
                  placeholder="Decrypted output will appear here..."
                  readOnly
                  defaultValue=""
                />
              </div>

              {error && <div class="input-error">{error}</div>}

              <button
                type="submit"
                class="generate-button"
                disabled={busy}
              >
                {busy ? "Decrypting..." : "Decrypt"}
              </button>
            </form>
          )}

        <div class="aes-footer">
          <a href="/" class="back-link">← Back to Home</a>
          <span class="aes-footer-sep">·</span>
          <a
            href={isDark ? "/aes-256" : "/aes-256?dark"}
            class="back-link"
          >
            {isDark ? "Light mode" : "Dark mode"}
          </a>
        </div>
      </div>
    </div>
  );
}
