import { defineConfig, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// vite-plugin-node-polyfills@0.26.0 still sets the top-level `esbuild` option,
// which Vite 8 deprecates in favor of `oxc`. The option only carries a dev-time
// `banner` that re-imports shims into every transformed module — redundant here
// because deps get polyfilled via `optimizeDeps.rolldownOptions` and our source
// does not reference Buffer/process/global directly.
function stripEsbuildOption(plugin: Plugin): Plugin {
  const originalConfig = plugin.config;
  const handler =
    typeof originalConfig === "function"
      ? originalConfig
      : originalConfig?.handler;
  if (!handler) return plugin;
  return {
    ...plugin,
    config(userConfig, env) {
      const result = handler.call(this, userConfig, env);
      if (result && typeof result === "object" && "esbuild" in result) {
        const { esbuild: _dropped, ...rest } = result as Record<string, unknown>;
        return rest;
      }
      return result;
    },
  };
}

export default defineConfig({
  plugins: [vue(), stripEsbuildOption(nodePolyfills())],
});
