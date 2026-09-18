import path from 'node:path'
import { existsSync } from 'node:fs'
import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isProduction = mode === 'production'
  const proxyPrefix = env.VITE_PROXY_PREFIX || '/dev'
  const iframeOrigins = (env.VITE_IFRAME_ORIGINS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
  for (const origin of iframeOrigins) {
    const url = new URL(origin)
    if (!['https:', 'http:'].includes(url.protocol) || url.origin !== origin)
      throw new Error('Invalid VITE_IFRAME_ORIGINS')
  }
  const framePolicy = `frame-src ${iframeOrigins.length ? iframeOrigins.join(' ') : "'none'"}; object-src 'none'; base-uri 'self'`

  return {
    base: env.VITE_APP_ROOT_BASE || '/',
    server: {
      open: true,
      port: Number(env.VITE_APP_PORT || 2777),
      strictPort: true,
      proxy: {
        [proxyPrefix]: {
          target: env.VITE_APP_API_BASEURL || 'http://127.0.0.1:9601',
          changeOrigin: command === 'serve' && env.VITE_OPEN_PROXY === 'true',
          rewrite: requestPath => requestPath.replace(new RegExp(`^${proxyPrefix}`), ''),
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'mineadmin-frame-policy',
        transformIndexHtml: () => [
          {
            tag: 'meta',
            attrs: { 'http-equiv': 'Content-Security-Policy', content: framePolicy },
            injectTo: 'head-prepend',
          },
        ],
      },
    ],
    build: {
      outDir: isProduction ? 'dist' : `dist-${mode}`,
      sourcemap: env.VITE_BUILD_SOURCEMAP === 'true',
      minify: 'esbuild',
      cssMinify: 'esbuild',
      rollupOptions: {
        output: {
          codeSplitting: true,
          chunkFileNames: 'static/js/[name]-[hash].js',
          entryFileNames: 'static/js/[name]-[hash].js',
          assetFileNames: 'static/[ext]/[name]-[hash].[ext]',
        },
      },
    },
    define: {
      __MINE_SYSTEM_INFO__: JSON.stringify({
        pkg: { version: '3.2.1' },
        lastBuildTime: new Date().toISOString(),
      }),
    },
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'src'),
        '@application-styles': path.resolve(
          process.cwd(),
          existsSync('src/app/application.css') ? 'src/app/application.css' : 'src/app/default-styles.css',
        ),
        '@application': path.resolve(
          process.cwd(),
          existsSync('src/app/application.tsx') ? 'src/app/application.tsx' : 'src/app/default-application.ts',
        ),
        '#': path.resolve(process.cwd(), 'src/types'),
        $: path.resolve(process.cwd(), 'src/plugins'),
        '~': path.resolve(process.cwd(), 'src/modules'),
      },
    },
  }
})
