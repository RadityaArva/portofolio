import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    tailwindcss(),
    visualizer({
      filename: 'dist/bundle-analyzer.html',
      open: false,
      gzipSize: true,
      brotliSize: false,
    })
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        projects: resolve(__dirname, 'projects.html'),
      },
      output: {
        manualChunks: {
          gsap: ['gsap'],
          vendor: ['lodash', 'date-fns']
        },
        assetFileNames: (assetInfo) => {
          if (/\.(png|jpe?g|svg|gif|webp)$/.test(assetInfo.name)) {
            return 'assets/images/[name]-[hash][extname]'
          }
          if (/\.(css)$/.test(assetInfo.name)) {
            return 'assets/css/[name]-[hash][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    },
    cssCodeSplit: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000,
  },
  server: {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    }
  }
})