import { defineConfig } from 'vite';
import type { Terser } from 'vite';
// @ts-ignore — Node built-ins, resolved by Vite at config time
import { readFileSync, writeFileSync } from 'node:fs';
// @ts-ignore — Node built-ins, resolved by Vite at config time
import { resolve, dirname } from 'node:path';
// @ts-ignore — Node built-ins, resolved by Vite at config time
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Custom plugin: auto-version service worker on build
function swVersionPlugin() {
    return {
        name: 'sw-version',
        closeBundle() {
            const swPath = resolve(__dirname, 'dist/sw.js');
            try {
                let content = readFileSync(swPath, 'utf-8');
                const hash = Date.now().toString(36);
                content = content.replace('%%BUILD_HASH%%', hash);
                writeFileSync(swPath, content);
                console.log(`\n  ✓ SW cache version set to: qrscan-v${hash}\n`);
            } catch { /* sw.js not in dist — skip */ }
        },
    };
}

// https://vitejs.dev/config/
export default defineConfig({
    // Deployed at root level on mudik.kelazz.my.id
    base: '/',

    plugins: [swVersionPlugin()],

    build: {
        outDir: 'dist',
        sourcemap: false,
        minify: 'terser',
        cssMinify: true,
        // Terser options for maximum minification
        terserOptions: {
            compress: {
                drop_console: true,   // Remove console.log in production
                drop_debugger: true,
            },
        } as Terser.MinifyOptions,
        // Chunk splitting for better caching and multiple entry points
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                admin: resolve(__dirname, 'admin.html')
            }
        },
    },

  // Dev server settings
  server: {
    port: 5173,
    open: process.env.VITE_OPEN === 'true',
    proxy: process.env.VITE_PROXY_TARGET
      ? {
        '/api': {
          target: process.env.VITE_PROXY_TARGET,
          changeOrigin: true,
        },
        '/uploads': {
          target: process.env.VITE_PROXY_TARGET,
          changeOrigin: true,
        },
      }
      : undefined,
  },

    preview: {
        port: 4173,
    },
});
