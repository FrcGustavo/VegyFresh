import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { defineConfig, loadEnv, type Plugin, type ResolvedConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

function normalizeApiUrl(value: string | undefined): string {
  const apiUrl = value?.trim().replace(/\/+$/, "");

  if (!apiUrl) {
    throw new Error("VITE_API_URL es requerido para compilar el frontend");
  }

  const parsedUrl = new URL(apiUrl);
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("VITE_API_URL debe ser una URL absoluta HTTP(S)");
  }

  return apiUrl;
}

function runtimeConfigPlugin(apiUrl: string): Plugin {
  let resolvedConfig: ResolvedConfig;

  return {
    name: "vegyfresh-runtime-config",
    configResolved(config) {
      resolvedConfig = config;
    },
    async closeBundle() {
      const outputDirectory = resolve(
        resolvedConfig.root,
        resolvedConfig.build.outDir,
      );
      const runtimeConfig = `window.__VEGYFRESH_CONFIG__ = {\n  API_URL: ${JSON.stringify(apiUrl)},\n};\n`;

      await mkdir(outputDirectory, { recursive: true });
      await writeFile(resolve(outputDirectory, "config.js"), runtimeConfig);
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiUrl =
    command === "build"
      ? normalizeApiUrl(process.env.VITE_API_URL || env.VITE_API_URL)
      : undefined;

  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      ...(apiUrl ? [runtimeConfigPlugin(apiUrl)] : []),
    ],
  };
});
