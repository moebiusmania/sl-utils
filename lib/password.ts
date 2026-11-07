// Shared by the browser UI and /api/password. Uses only Web Crypto, so it runs
// unchanged in Bun and in the browser.

export const MIN_LENGTH = 4;
export const MAX_LENGTH = 128;

export const CHARSETS = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+",
} as const;

export type CharsetName = keyof typeof CHARSETS;

export interface PasswordOptions {
  length: number;
  charsets: CharsetName[];
}

export class PasswordOptionsError extends Error {}

/** Uniform random integer in [0, max) from a CSPRNG, without modulo bias. */
const randomIndex = (max: number): number => {
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  const buf = new Uint32Array(1);
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return buf[0] % max;
};

const pick = (chars: string): string => chars[randomIndex(chars.length)];

/**
 * Generates a password with at least one character from every selected
 * charset, then shuffles it so those guaranteed characters are not positional.
 */
export const generatePassword = ({ length, charsets }: PasswordOptions): string => {
  if (!Number.isInteger(length) || length < MIN_LENGTH || length > MAX_LENGTH) {
    throw new PasswordOptionsError(
      `Length must be an integer between ${MIN_LENGTH} and ${MAX_LENGTH}`,
    );
  }
  const selected = [...new Set(charsets)].filter((c) => c in CHARSETS);
  if (selected.length === 0) {
    throw new PasswordOptionsError("Select at least one character type");
  }

  const all = selected.map((c) => CHARSETS[c]).join("");
  const chars = selected.map((c) => pick(CHARSETS[c]));
  while (chars.length < length) chars.push(pick(all));

  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
};
