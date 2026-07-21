import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: "Brook's Place — Order",
        short_name: 'Order',
        description: 'Self-order at the shop',
        theme_color: '#7a4a24',
        background_color: '#fbf6ef',
        display: 'standalone',
        start_url: '/',
        icons: [],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@brooks/ui': fileURLToPath(new URL('../../packages/ui/src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    fs: { allow: ['../..'] },
    proxy: {
      // Dev convenience: same-origin API calls proxied to Laravel.
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
});
