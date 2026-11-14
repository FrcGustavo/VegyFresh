import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  plugins: [
    tanstackStart({ router: { routesDirectory: "presentation/routes", generatedRouteTree: "presentation/routeTree.gen.ts" } }),
    react(),
    nitro({ renderer: false }),
  ],
});
