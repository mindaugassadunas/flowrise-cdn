import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        form: resolve(__dirname, 'src/products/form/form.ts'),
        // Add other products as you build them:
        // 'modal': resolve(__dirname, 'src/products/modal/modal.ts'),
        // 'tooltip': resolve(__dirname, 'src/products/tooltip/tooltip.ts'),
      },
      output: {
        dir: 'dist',
        entryFileNames: 'webflow-ext-[name].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        format: 'iife',
        name: 'WebflowExt',
        globals: {
          // swiper: 'Swiper',
        },
      },
      // External dependencies
      // external: ['swiper'],
    },
    minify: 'esbuild',
    sourcemap: true,
    assetsInlineLimit: 1024 * 1024,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    cors: {
      origin: '*',
      methods: ['GET'],
    },
  },
});
