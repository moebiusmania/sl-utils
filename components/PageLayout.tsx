import type { ComponentChildren } from "preact";

interface PageLayoutProps {
  title: string;
  subtitle?: ComponentChildren;
  wide?: boolean;
  children?: ComponentChildren;
}

export const PageLayout = (
  { title, subtitle, wide = false, children }: PageLayoutProps,
) => {
  return (
    <main class="page">
      <div class={`page-container${wide ? " page-container--wide" : ""}`}>
        <header class="page-header">
          <h1 class="page-title">{title}</h1>
          {subtitle && <p class="page-subtitle">{subtitle}</p>}
        </header>
        {children}
        <footer class="page-footer">
          <a href="/" class="back-link">← Back home</a>
        </footer>
      </div>
    </main>
  );
};
