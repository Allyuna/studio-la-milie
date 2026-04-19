import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    nodePolyfills({ include: ['buffer', 'util', 'process'] }),
  ],
  resolve: {
    alias: {
      'three/addons/': path.join(__dirname, 'node_modules/three/examples/jsm/') + '/',
    },
  },
  build: {
    lib: {
      entry: path.join(__dirname, 'ar-bundle-entry.js'),
      formats: ['iife'],
      name: 'AR_GLOBALS',
      fileName: () => 'mindar-bundle.js',
    },
    outDir: 'public',
    emptyOutDir: false,
    minify: true,
    rollupOptions: {
      output: {
        // Ensure IIFE wraps everything
        inlineDynamicImports: true,
      },
    },
  },
});
