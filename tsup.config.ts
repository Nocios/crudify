import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/fetch-wrapper.ts", "src/fetch-browser-impl.ts"],
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  target: "node18",
});
