import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_URL || '/',
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString().slice(0, 10)),
    __VERSION__: JSON.stringify(process.env.npm_package_version || '0.1.0'),
  },
});
