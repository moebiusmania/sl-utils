import preact from "@preact/preset-vite";
import vike from "vike/plugin";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [preact(), vike()],
});
