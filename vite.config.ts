
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  // กำหนด base path ให้ตรงกับชื่อ Repository บน GitHub Pages
  base: '/Checkin/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      // กำหนด scope ของ PWA ให้จำกัดอยู่ในโฟลเดอร์นี้
      scope: '/Checkin/',
      manifest: {
        name: 'UprightSchool Check-in',
        short_name: 'UprightSchool',
        description: 'ระบบเช็คอินงานโรงเรียนสุจริต ระดับประเทศ',
        theme_color: '#2563eb',
        background_color: '#f3f4f6',
        display: 'standalone',
        orientation: 'portrait',
        // สำคัญ: กำหนดให้เปิดแอปที่ path นี้เสมอ
        start_url: '/Checkin/',
        scope: '/Checkin/',
        icons: [
          {
            src: 'https://raw.githubusercontent.com/noppharut5252/Checkin/refs/heads/main/logo/logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://raw.githubusercontent.com/noppharut5252/Checkin/refs/heads/main/logo/logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': '.',
    },
  },
});
