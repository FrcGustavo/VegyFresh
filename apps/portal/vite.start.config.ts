import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

export default defineConfig({
  // The legacy SPA index.html must not replace Start SSR in the Nitro build.
  plugins: [tanstackStart(), react(), nitro({ renderer: false })],
});
