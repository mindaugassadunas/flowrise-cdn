// import { defineConfig } from 'vite'
// import { resolve, dirname } from 'path'
// import { fileURLToPath } from 'url'

// const __dirname = dirname(fileURLToPath(import.meta.url))

// export default defineConfig({
//   build: {
//     rollupOptions: {
//       input: {
//         'main': resolve(__dirname, 'src/main.ts'),
//       },
//       output: {
//         entryFileNames: '[name].js',
//         format: 'iife',
//         name: 'WebflowExt[name]',
//       }
//     },
//     minify: 'esbuild',
//     sourcemap: true
//   }
// })

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
        format: 'iife',
        name: 'WebflowExt[name]',
        globals: {
          swiper: 'Swiper',
          'just-validate': 'JustValidate',
        },
      },
      // External dependencies
      external: ['swiper', 'just-validate'],
    },
    minify: 'esbuild',
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
