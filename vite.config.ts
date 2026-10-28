import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// En GitHub Pages la app vive en https://<usuario>.github.io/<repo>/
// El workflow pasa BASE_PATH=/<repo>/ ; en local se usa "/".
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Gestor de gastos',
        short_name: 'Gastos',
        description: 'Analiza tus movimientos bancarios en local',
        lang: 'es',
        theme_color: '#1f6f5c',
        background_color: '#f7f6f2',
        display: 'standalone',
        start_url: '.',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 700 },
});
