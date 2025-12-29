import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    json: 'src/json.ts',
    testing: 'src/testing/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: {
    compilerOptions: {
      composite: false,
    },
  },
  sourcemap: true,
  clean: true,
  target: 'es2022',
});
