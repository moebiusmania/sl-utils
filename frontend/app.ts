import "./styles.css";
import { createInertiaApp } from "@inertiajs/vue3";
import AppLayout from "./layouts/AppLayout.vue";

createInertiaApp({
  // Bundle every page with the app: they are small, and it avoids a
  // second round-trip before hydration
  pages: { path: "./pages", lazy: false },
  layout: () => AppLayout,
  // Navigation used to be full page loads, with no progress indicator
  progress: false,
});
