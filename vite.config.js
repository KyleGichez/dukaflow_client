import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: 'Dukaflow Inventory Manager',
        short_name: 'Dukaflow Inventory',
        description: 'Inventory Management & Point of Sale Software System',
        theme_color: '#ffffff',
        icons: [
          {
            "src": "/web-app-manifest-192x192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any maskable"
          },
          {
            "src": "/web-app-manifest-512x512.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "any maskable"
          }
        ]
      },
      injectRegister: null,
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
});
