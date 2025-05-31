export const Hero = ({ isDark }: { isDark: boolean }) => {
  return (
    <>
      <figure class="hero-figure">
        <a href={isDark ? "/" : "/?dark"}>
          <img
            src="sl.png"
            alt="my pixel-art avatar"
            class="hero-avatar"
          />
        </a>
      </figure>
      <h1 class="hero-title">
        sl-utils
      </h1>
      <p class="hero-subtitle">
        🛠️ A collection of small utilities for myself 🤓
      </p>
    </>
  );
};
