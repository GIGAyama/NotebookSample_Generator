import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        id: './',
        name: 'ノート見本作成ツール PRO',
        short_name: 'ノート見本',
        description: '小学校のノート指導用の見本（板書計画）を作成・印刷できるツール',
        lang: 'ja',
        dir: 'ltr',
        categories: ['education', 'productivity'],
        start_url: './',
        scope: './',
        display: 'standalone',
        // スマホ・タブレット・PC どの向きでも使えるよう向きは固定しない
        orientation: 'any',
        theme_color: '#047857',
        background_color: '#f8fafc',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 書体（woff2）も先読みに入れる。入れないと、はじめて圏外で開いたときに
        // 画面の字が端末のフォントに落ちる（2026-11-10 までは Google Fonts を
        // 実行時にキャッシュしていた。いまは自分のところから配っている）。
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
      },
    }),
  ],
  base: './',
});
