import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiPort = Number(env.SUBMATE_PORT || env.PORT || 3001);
  // The browser is served by Vite, so its Origin is the Vite origin; the proxy
  // forwards /api to the Express API. localhost (not 127.0.0.1) keeps the dev
  // origin consistent with the backend's trusted-origin list.
  const apiTarget = env.VITE_API_TARGET || `http://localhost:${apiPort}`;

  return {
    plugins: [react()],
    esbuild: {
      jsx: 'automatic',
    },
    server: {
      port: Number(env.VITE_PORT || 5173),
      strictPort: false,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.js',
      include: ['src/**/*.test.{js,jsx}'],
      css: false,
    },
  };
});
