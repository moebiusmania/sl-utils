export const Hero = ({ isDark }: { isDark: boolean }) => {
  return (
    <>
      <figure class="overflow-hidden mb-4">
        <a href={isDark ? "/" : "/?dark"}>
          <img
            src="sl.png"
            alt="my pixel-art avatar"
            class="w-24 h-24 object-cover border border-gray-300 rounded-full mx-auto"
          />
        </a>
      </figure>
      <h1 class="text-4xl md:text-5xl font-bold mb-4">
        sl-utils
      </h1>
      <p class="text-lg md:text-xl text-gray-600 dark:text-gray-400">
        🛠️ A collection of small utilities for myself 🤓
      </p>
    </>
  );
};
