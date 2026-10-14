import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.web.mjs', '.mjs', '.web.js', '.js', '.web.ts', '.ts', '.web.tsx', '.tsx', '.jsx', '.json'],
    alias: [
      { find: /^react-native$/, replacement: fileURLToPath(import.meta.resolve('react-native-web')) },
    ],
  },
  envPrefix: ['VITE_', 'EXPO_PUBLIC_'],
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    manifest: true,
    assetsInlineLimit: 4096,
    rollupOptions: { input: `${projectRoot}index.html` },
  },
  server: { host: '0.0.0.0' },
});
