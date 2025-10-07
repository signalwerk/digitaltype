import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs-extra";
import path from "path";
import chokidar from "chokidar";
import { glob } from "glob";
import { processAllPages } from "./packages/signalwerk.cms/processAllPages.js"; // Import the function to process all pages

import {
  processPageFile,
  BuildError,
} from "./packages/signalwerk.cms/src/processor/generateStaticHTML.js";

import { markdownToJson } from "./packages/signalwerk.cms/src/processor/markdownToJson.js";

import config from "./cms.config.jsx";

const BASE_DIR = config.content.base || "pages";
const PATTERN = config.content.pattern || "**/*.json";
const PAGE_FILES_PATTERN = `${BASE_DIR}/${PATTERN}`;

/**
 * Resolves API request URLs to actual filesystem paths (.json or .md files)
 * 
 * Request variants (all resolve to same file):
 *   /api/pages/test-page                    → pages/test-page.{json,md}
 *   /api/pages/test-page.json               → pages/test-page.json
 *   /api/pages/test-page.md                 → pages/test-page.md
 *   /api/pages/test-page/                   → pages/test-page.{json,md}
 *   /api/pages/test-page/index.{html,json}  → pages/test-page.{json,md}
 * 
 * Tries .json first, then .md for each variant
 */
async function resolveApiPath(requestUrl) {
  // Clean up the URL - remove leading slash and decode
  const cleanUrl = decodeURIComponent(
    requestUrl.startsWith("/") ? requestUrl.slice(1) : requestUrl,
  );

  // Try different path variations for both .json and .md files
  const pathsToTry = [
    // Direct path as provided
    cleanUrl,
    // Add .json if not present
    cleanUrl.endsWith(".json") ? cleanUrl : `${cleanUrl}.json`,
    // Add .md if not present
    cleanUrl.endsWith(".json") ? `${cleanUrl.slice(0, -5)}.md` : null,
    // Remove trailing slash and add .json
    cleanUrl.endsWith("/") ? `${cleanUrl.slice(0, -1)}.json` : null,
    // Remove trailing slash and add .md
    cleanUrl.endsWith("/") ? `${cleanUrl.slice(0, -1)}.md` : null,
    // Handle index variations
    cleanUrl.endsWith("/index.html") ? `${cleanUrl.slice(0, -11)}.json` : null,
    cleanUrl.endsWith("/index.html") ? `${cleanUrl.slice(0, -11)}.md` : null,
    cleanUrl.endsWith("/index.json") ? `${cleanUrl.slice(0, -11)}.json` : null,
    cleanUrl.endsWith("/index.json") ? `${cleanUrl.slice(0, -11)}.md` : null,
    cleanUrl.endsWith("index.html") ? `${cleanUrl.slice(0, -10)}.json` : null,
    cleanUrl.endsWith("index.html") ? `${cleanUrl.slice(0, -10)}.md` : null,
    cleanUrl.endsWith("index.json") ? `${cleanUrl.slice(0, -10)}.json` : null,
    cleanUrl.endsWith("index.json") ? `${cleanUrl.slice(0, -10)}.md` : null,
  ].filter(Boolean); // Remove null values

  // Try each path variation
  for (const pathVariant of pathsToTry) {
    const fullPath = path.join(BASE_DIR, pathVariant);
    try {
      if (await fs.pathExists(fullPath)) {
        return fullPath;
      }
    } catch (error) {
      // Continue to next path variant
      continue;
    }
  }

  return null;
}

// Custom plugin for page processing and API
function pagesPlugin() {
  return {
    name: "pages-plugin",
    configureServer(server) {
      // API middleware to serve JSON files
      server.middlewares.use("/api/", async (req, res, next) => {
        try {
          const resolvedPath = await resolveApiPath(req.url);

          if (resolvedPath) {
            let data;
            const fileExtension = path.extname(resolvedPath);

            if (fileExtension === ".md") {
              // Convert markdown to JSON structure
              data = await markdownToJson(resolvedPath);
            } else if (fileExtension === ".json") {
              // Read JSON directly
              data = await fs.readJson(resolvedPath);
            } else {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: "Unsupported file type" }));
              return;
            }

            const response = { data };
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(response));
          } else {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: "Page not found" }));
          }
        } catch (error) {
          console.error(
            `❌ Error serving API request ${req.url}:`,
            error.message,
          );
          res.statusCode = 500;
          res.end(JSON.stringify({ error: error.message }));
        }
      });

      // Watch for changes
      const watcher = chokidar.watch(PAGE_FILES_PATTERN, {
        ignored: /node_modules/,
        persistent: true,
      });

      watcher.on("change", async (filePath) => {
        console.log(`\n📄 Processing changed file: ${filePath}`);
        try {
          await processPageFile(filePath, { baseDir: BASE_DIR });
          server.ws.send({ type: "full-reload" });
        } catch (error) {
          console.error(
            `\n🚨 Error processing ${filePath} during development:`,
          );
          if (error instanceof BuildError) {
            console.error(error.toString());
          } else {
            console.error(error);
          }
          // In dev mode, we don't want to crash the server, just show the error
        }
      });

      watcher.on("add", async (filePath) => {
        console.log(`\n📄 Processing new file: ${filePath}`);
        try {
          await processPageFile(filePath, { baseDir: BASE_DIR });
          server.ws.send({ type: "full-reload" });
        } catch (error) {
          console.error(
            `\n🚨 Error processing new file ${filePath} during development:`,
          );
          if (error instanceof BuildError) {
            console.error(error.toString());
          } else {
            console.error(error);
          }
          // In dev mode, we don't want to crash the server, just show the error
        }
      });

      // Process all pages on startup
      console.log("🚀 Processing all pages on server start...");
      processAllPages({ pattern: PAGE_FILES_PATTERN, baseDir: BASE_DIR }).catch(
        (error) => {
          console.error("\n🚨 Failed to process pages on server startup:");
          if (error instanceof BuildError) {
            console.error(error.toString());
          } else {
            console.error(error);
          }
          // In dev mode, continue despite errors
        },
      );
    },

    async buildStart() {
      console.log("🔨 Building all pages for production...");

      try {
        await processAllPages({
          pattern: PAGE_FILES_PATTERN,
          baseDir: BASE_DIR,
        });
        console.log("🎉 All pages built successfully for production!");
      } catch (error) {
        console.error("\n💀 PRODUCTION BUILD FAILED:");

        if (error instanceof BuildError) {
          console.error(error.toString());
        } else {
          console.error("Unexpected build error:", error);
        }

        console.error("\n🛑 Build process terminated due to errors.\n");

        // This will cause the build to fail
        throw error;
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), pagesPlugin()],
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
