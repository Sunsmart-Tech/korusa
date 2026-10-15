import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react(), tailwindcss()],
    base: './',
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            const modulePath = id.replace(/\\/g, '/');

            if (!modulePath.includes('/node_modules/')) return;
            if (/\/node_modules\/(react|react-dom|scheduler)\//.test(modulePath)) {
              return 'react-vendor';
            }
            if (/\/node_modules\/(react-router|react-router-dom)\//.test(modulePath)) {
              return 'router-vendor';
            }
            if (modulePath.includes('/node_modules/@supabase/')) return 'supabase-vendor';
            if (modulePath.includes('/node_modules/lucide-react/')) return 'icons-vendor';
            if (
              modulePath.includes('/node_modules/recharts/')
              || modulePath.includes('/node_modules/victory-vendor/')
              || /\/node_modules\/d3-[^/]+\//.test(modulePath)
            ) {
              return 'charts-vendor';
            }
            if (modulePath.includes('/node_modules/')) return 'vendor';
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
