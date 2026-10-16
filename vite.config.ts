import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    {
      name: 'inline-global-style',
      transformIndexHtml: {
        order: 'post',
        handler(html, context) {
          if (!context.bundle) return html
          // Keep the shared stylesheet in the first document (~16 kB gzip),
          // removing a blocking request before the initial loading UI can paint.
          for (const asset of Object.values(context.bundle)) {
            if (asset.type !== 'asset' || !asset.fileName.endsWith('.css') || !html.includes(`href="/${asset.fileName}"`)) continue
            html = html.replace(/<link\b[^>]*>/g, tag => tag.includes('rel="stylesheet"') && tag.includes(`href="/${asset.fileName}"`) ? '' : tag)
            html = html.replace('</head>', `<style>${asset.source}</style></head>`)
          }
          return html
        },
      },
    },
    TanStackRouterVite({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    watch: { ignored: ['**/artifacts/**', '**/playwright-report/**', '**/test-results/**', '**/lighthouse-report/**', '**/tests/**'] },
  },
})
