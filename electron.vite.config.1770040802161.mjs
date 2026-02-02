// electron.vite.config.mjs
import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      minify: "esbuild",
      target: "node18",
      sourcemap: false
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      minify: "esbuild",
      target: "node18",
      sourcemap: false
    }
  },
  build: {
    outDir: "dist",
    minify: "esbuild",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: void 0
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src")
      }
    },
    plugins: [react()],
    build: {
      minify: "esbuild",
      sourcemap: false,
      target: "chrome120",
      rollupOptions: {
        output: {
          // Put all node_modules into a single vendor chunk to avoid circular
          // chunk references (React must be available before other vendor code).
          manualChunks: (id) => {
            if (id.includes("node_modules")) {
              return "vendor";
            }
          }
        }
      }
    }
  }
});
export {
  electron_vite_config_default as default
};
