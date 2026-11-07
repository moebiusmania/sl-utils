import { useState } from "preact/hooks";
import { generatePassword, MAX_LENGTH, MIN_LENGTH } from "../lib/password.ts";

interface PasswordOptions {
  length: number;
  numbers: boolean;
  symbols: boolean;
  lowercase: boolean;
  uppercase: boolean;
}

type CharacterType = Exclude<keyof PasswordOptions, "length">;

export default function PasswordGenerator() {
  const [options, setOptions] = useState<PasswordOptions>({
    length: 12,
    numbers: true,
    symbols: true,
    lowercase: true,
    uppercase: true,
  });

  const [generatedPassword, setGeneratedPassword] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const [error, setError] = useState<string>("");

  // Generated locally with Web Crypto: the password never leaves the browser.
  const handleSubmit = (e: Event) => {
    e.preventDefault();
    setCopied(false);
    setError("");
    try {
      setGeneratedPassword(
        generatePassword({
          length: options.length,
          charsets: characterTypes
            .map(({ key }) => key)
            .filter((key) => options[key]),
        }),
      );
    } catch (err) {
      setGeneratedPassword("");
      setError(err instanceof Error ? err.message : "Generation failed");
    }
  };

  const copyToClipboard = async () => {
    if (generatedPassword) {
      try {
        await navigator.clipboard.writeText(generatedPassword);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error("Failed to copy password:", error);
      }
    }
  };

  const updateOption = <K extends keyof PasswordOptions>(
    key: K,
    value: PasswordOptions[K],
  ) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  const characterTypes: { key: CharacterType; label: string }[] = [
    { key: "lowercase", label: "Lowercase (a-z)" },
    { key: "uppercase", label: "Uppercase (A-Z)" },
    { key: "numbers", label: "Numbers (0-9)" },
    { key: "symbols", label: "Symbols (!@#$...)" },
  ];

  return (
    <>
      <form class="form" onSubmit={handleSubmit}>
        <div class="form-group">
          <label class="form-label" htmlFor="length">
            Length: {options.length}
          </label>
          <input
            type="range"
            id="length"
            class="form-range"
            min={MIN_LENGTH}
            max={MAX_LENGTH}
            value={options.length}
            onInput={(e) =>
              updateOption("length", parseInt(e.currentTarget.value))}
          />
          <div class="range-labels">
            <span>{MIN_LENGTH}</span>
            <span>{MAX_LENGTH}</span>
          </div>
        </div>

        <fieldset class="form-group">
          <legend class="form-label">Character types</legend>
          <div class="checkbox-grid">
            {characterTypes.map(({ key, label }) => (
              <label class="checkbox-label" key={key}>
                <input
                  type="checkbox"
                  checked={options[key]}
                  onChange={(e) =>
                    updateOption(key, e.currentTarget.checked)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          class="btn btn-primary btn-block"
          disabled={!options.lowercase && !options.uppercase &&
            !options.numbers && !options.symbols}
        >
          Generate password
        </button>

        {error && <p class="error-text">{error}</p>}
      </form>

      {generatedPassword && (
        <div class="result">
          <span class="form-label">Generated password</span>
          <div class="output-row">
            <code class="output-text">{generatedPassword}</code>
            <button
              type="button"
              class="btn btn-secondary"
              onClick={copyToClipboard}
              title="Copy to clipboard"
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
