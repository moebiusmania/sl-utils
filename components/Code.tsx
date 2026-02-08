import type { JSX } from "preact/jsx-runtime";

export const Code = ({ children }: { children: JSX.Element }) => {
  return (
    <span class="code-span">
      {children}
    </span>
  );
};
