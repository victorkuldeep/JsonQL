import { defineConfig } from "rollup";
import typescript from "rollup-plugin-typescript2";

export default defineConfig({
  input: "src/index.ts",
  plugins: [typescript()],
  output: {
    file: "dist/iife/jsonql.js",
    format: "iife",
    name: "JsonSearchEngine",
    sourcemap: true,
    exports: "named",
  },
  external: [],
  treeshake: false,
});