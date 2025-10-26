import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: {
    compilerOptions: {
      composite: false,
    },
  },
  sourcemap: 'inline',
  minify: true,
  clean: true,
  splitting: false,
  treeshake: true,
  external: ['react'],
});
