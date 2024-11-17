import { JSX } from "preact/jsx-runtime";

export const Code = ({ children }: { children: JSX.Element }) => {
  return (
    <span class="font-mono text-sm text-gray-600 px-1 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 dark:text-gray-400">
      {children}
    </span>
  );
};
