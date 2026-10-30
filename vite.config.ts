import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// La app vive en https://gamitadiaz.github.io/fotos/, por eso todo cuelga de /fotos/.
export default defineConfig({
  base: "/fotos/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icono.svg"],
      manifest: {
        name: "Lente: editor de fotos",
        short_name: "Lente",
        description: "Efectos para tus fotos, como ojo de pez, sin subirlas a ningún lado.",
        lang: "es-MX",
        theme_color: "#0e0c0a",
        background_color: "#0e0c0a",
        display: "standalone",
        orientation: "portrait",
        start_url: "/fotos/",
        scope: "/fotos/",
        icons: [
          { src: "icono-192.png", sizes: "192x192", type: "image/png" },
          { src: "icono-512.png", sizes: "512x512", type: "image/png" },
          { src: "icono-mask.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: { globPatterns: ["**/*.{js,css,html,svg,png,woff2}"] },
    }),
  ],
});
