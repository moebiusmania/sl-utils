import { useState } from "preact/hooks";

interface PasswordOptions {
  length: number;
  numbers: boolean;
  symbols: boolean;
  lowercase: boolean;
  uppercase: boolean;
}

export default function PasswordGenerator() {
  const [options, setOptions] = useState<PasswordOptions>({
    length: 12,
    numbers: true,
    symbols: true,
    lowercase: true,
    uppercase: true,
  });

  const [generatedPassword, setGeneratedPassword] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setIsGenerating(true);
    setCopied(false);

    try {
      const params = new URLSearchParams();
      params.append("length", options.length.toString());
      if (options.numbers) params.append("numbers", "true");
      if (options.symbols) params.append("symbols", "true");
      if (options.lowercase) params.append("lowercase", "true");
      if (options.uppercase) params.append("uppercase", "true");

      const response = await fetch(`/api/password?${params.toString()}`);
      const password = await response.text();
      setGeneratedPassword(password);
    } catch (error) {
      console.error("Error generating password:", error);
    } finally {
      setIsGenerating(false);
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

  return (
    <div class="password-container">
      <header class="password-header">
        <h1 class="password-title">Password Generator</h1>
        <p class="password-subtitle">
          Create secure passwords with customizable options
        </p>
      </header>

      <form class="password-form" onSubmit={handleSubmit}>
        <div class="form-group">
          <label class="form-label" htmlFor="length">
            Password Length: {options.length}
          </label>
          <input
            type="range"
            id="length"
            class="form-range"
            min="4"
            max="128"
            value={options.length}
            onInput={(e) =>
              updateOption("length", parseInt(e.currentTarget.value))}
          />
          <div class="range-labels">
            <span>4</span>
            <span>128</span>
          </div>
        </div>

        <div class="form-group">
          <legend class="form-legend">Character Types</legend>
          <div class="checkbox-grid">
            <label class="checkbox-label">
              <input
                type="checkbox"
                class="form-checkbox"
                checked={options.lowercase}
                onChange={(e) =>
                  updateOption("lowercase", e.currentTarget.checked)}
              />
              <span class="checkbox-text">Lowercase (a-z)</span>
            </label>

            <label class="checkbox-label">
              <input
                type="checkbox"
                class="form-checkbox"
                checked={options.uppercase}
                onChange={(e) =>
                  updateOption("uppercase", e.currentTarget.checked)}
              />
              <span class="checkbox-text">Uppercase (A-Z)</span>
            </label>

            <label class="checkbox-label">
              <input
                type="checkbox"
                class="form-checkbox"
                checked={options.numbers}
                onChange={(e) =>
                  updateOption("numbers", e.currentTarget.checked)}
              />
              <span class="checkbox-text">Numbers (0-9)</span>
            </label>

            <label class="checkbox-label">
              <input
                type="checkbox"
                class="form-checkbox"
                checked={options.symbols}
                onChange={(e) =>
                  updateOption("symbols", e.currentTarget.checked)}
              />
              <span class="checkbox-text">Symbols (!@#$...)</span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          class="generate-button"
          disabled={isGenerating ||
            (!options.lowercase && !options.uppercase && !options.numbers &&
              !options.symbols)}
        >
          {isGenerating ? "Generating..." : "Generate Password"}
        </button>
      </form>

      {generatedPassword && (
        <div class="password-result">
          <label class="result-label">Generated Password:</label>
          <div class="password-display">
            <code class="password-text">{generatedPassword}</code>
            <button
              type="button"
              class="copy-button"
              onClick={copyToClipboard}
              title="Copy to clipboard"
            >
              {copied ? "✓ Copied!" : "📋 Copy"}
            </button>
          </div>
        </div>
      )}

      <div class="password-footer">
        <a href="/" class="back-link">← Back to Home</a>
      </div>
    </div>
  );
}
