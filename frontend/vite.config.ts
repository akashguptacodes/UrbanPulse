/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const rawPort = env.PORT || env.FRONTEND_PORT || '5173';
  const port = parseInt(rawPort, 10);

  return {
    plugins: [react()],
    server: {
      port: isNaN(port) ? 5173 : port,
      host: true,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './tests/setup.ts',
    },
  };
});
