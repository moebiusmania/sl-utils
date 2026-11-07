import { useState } from "preact/hooks";

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
          disabled={isGenerating ||
            (!options.lowercase && !options.uppercase && !options.numbers &&
              !options.symbols)}
        >
          {isGenerating ? "Generating..." : "Generate password"}
        </button>
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
