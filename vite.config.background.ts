import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    emptyOutDir: false,
    outDir: 'dist',
    lib: {
      entry: resolve(__dirname, 'src/background/service-worker.ts'),
      name: 'background',
      formats: ['iife'],
      fileName: () => 'background.js',
    },
  },
})
