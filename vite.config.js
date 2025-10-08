import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import { pagesPlugin, pagesOnlyPlugin } from "./packages/signalwerk.cms/src/processor/pagesPlugin.js";

import config from "./cms.config.jsx";

const BASE_DIR = config.content.base || "pages";
const PATTERN = config.content.pattern || "**/*.json";
// create a components object from config.components based on item.type
const components = config.components || {};

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    // Use pagesOnlyPlugin for build, pagesPlugin for dev
    command === 'build' 
      ? pagesOnlyPlugin({
          baseDir: BASE_DIR,
          pattern: PATTERN,
          components,
        })
      : pagesPlugin({
          baseDir: BASE_DIR,
          pattern: PATTERN,
          components,
        }),
  ],
  publicDir: "public", // Serve public folder during dev and copy during build
  build: {
    outDir: "dist",
    emptyOutDir: false,
    sourcemap: true, // Enable source maps for better debugging
    rollupOptions: {
      input: {
        main: command === 'build' ? "build-entry.js" : "index.html",
      },
      output: {
        // For pages-only build, only output CSS, skip JS bundle
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith(".css")) {
            return "assets/styles.css";
          }
          return assetInfo.name || "assets/[name].[ext]";
        },
        entryFileNames: () => {
          // We don't want the JS bundle for pages-only build, but Vite requires this
          return command === 'build' ? "empty.js" : "[name].js";
        },
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
}));
