import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    emptyOutDir: false,
    outDir: 'dist',
    lib: {
      entry: resolve(__dirname, 'src/content/content.ts'),
      name: 'content',
      formats: ['iife'],
      fileName: () => 'content.js',
    },
  },
})
