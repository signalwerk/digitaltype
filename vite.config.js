import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import { pagesPlugin } from "./packages/signalwerk.cms/src/processor/pagesPlugin.js";

import config from "./cms.config.jsx";

const BASE_DIR = config.content.base || "pages";
const PATTERN = config.content.pattern || "**/*.json";

export default defineConfig({
  plugins: [
    react(),
    pagesPlugin({
      baseDir: BASE_DIR,
      pattern: PATTERN,
    }),
  ],
  publicDir: "public", // Serve public folder during dev and copy during build
  build: {
    outDir: "dist",
    emptyOutDir: false,
    sourcemap: true, // Enable source maps for better debugging
    rollupOptions: {
      input: {
        main: "index.html",
      },
      // Add better error handling for Rollup
      onwarn(warning, warn) {
        // Show warnings but in a more structured way
        if (warning.code === "UNRESOLVED_IMPORT") {
          console.warn(
            `⚠️  Unresolved import: ${warning.source} in ${warning.importer}`,
          );
        } else {
          console.warn(`⚠️  ${warning.code}: ${warning.message}`);
        }
        warn(warning);
      },
    },
  },
  server: {
    port: 3000,
    open: true,
    fs: {
      allow: ["..", "dist", BASE_DIR],
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
