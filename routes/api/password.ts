interface Options {
  length?: number;
  numbers?: boolean;
  symbols?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
}

type Charset = "numbers" | "symbols" | "lowercase" | "uppercase";

export const generatePassword = (_options?: Options): string => {
  const defaults: Options = {
    length: 12,
    numbers: true,
    symbols: true,
    lowercase: true,
    uppercase: true,
  };

  const sets = {
    numbers: "0123456789",
    symbols: "!@#$%^&*()_+",
    lowercase: "abcdefghijklmnopqrstuvwxyz",
    uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  };

  const options = { ...defaults, ..._options };

  console.log(options, _options);

  const charset = Object.keys(options)
    .sort()
    .filter((key) => options[key as Charset])
    .map((key) => sets[key as Charset])
    .join("");

  const pswd = Array.from(
    { length: options.length || (defaults.length as number) },
    () => charset[Math.floor(Math.random() * charset.length)],
  ).join("");

  return pswd;
};

export const handler = (_req: Request): Response => {
  const { searchParams } = new URL(_req.url);

  const length = parseInt(searchParams.get("length") || "12");
  const numbers = searchParams.get("numbers") === "false" ? false : true;
  const symbols = searchParams.get("symbols") === "false" ? false : true;
  const lowercase = searchParams.get("lowercase") === "false" ? false : true;
  const uppercase = searchParams.get("uppercase") === "false" ? false : true;

  const password = generatePassword({ length, numbers, symbols, lowercase, uppercase });
  return new Response(password, {
    headers: { "Content-Type": "text/plain" },
  });
};
