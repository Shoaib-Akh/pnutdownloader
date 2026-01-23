import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      minify: 'esbuild',
      target: 'node18',
      sourcemap: false
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      minify: 'esbuild',
      target: 'node18',
      sourcemap: false
    }
  },
  build: {
    outDir: 'dist',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()],
    build: {
      minify: 'esbuild',
      sourcemap: false,
      target: 'chrome120',
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Split vendor chunks for better caching and size optimization
            if (id.includes('node_modules')) {
              // React and React DOM should be together
              if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
                return 'react-vendor'
              }
              // Firebase is large, keep it separate
              if (id.includes('firebase') || id.includes('@firebase')) {
                return 'firebase-vendor'
              }
              // Bootstrap and related
              if (id.includes('bootstrap') || id.includes('react-bootstrap') || id.includes('@popperjs')) {
                return 'bootstrap-vendor'
              }
              // Everything else goes to vendor
              return 'vendor'
            }
          }
        }
      }
    }
  }
})

