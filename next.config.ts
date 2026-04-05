import type { NextConfig } from "next";

const CSP = [
  "default-src 'self'",
  // Next.js App Router precisa de unsafe-inline para hidratação e o script de tema
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // Tailwind e Next.js injetam estilos inline
  "style-src 'self' 'unsafe-inline'",
  // Imagens: próprio servidor + YouTube/Google (thumbnails e avatars)
  "img-src 'self' data: blob: https://i.ytimg.com https://yt3.googleusercontent.com https://yt3.ggpht.com https://lh3.googleusercontent.com",
  // Fontes: Geist é servida localmente pelo Next.js
  "font-src 'self'",
  // Conexões: apenas próprio servidor
  "connect-src 'self'",
  // Sem frames embutidos
  "frame-src 'none'",
  // Ninguém pode embutir este site em iframe
  "frame-ancestors 'none'",
  // Sem plugins (Flash etc.)
  "object-src 'none'",
  // Protege contra injeção de base href
  "base-uri 'self'",
  // Formulários só para o próprio site e Google OAuth
  "form-action 'self' https://accounts.google.com",
].join('; ');

const securityHeaders = [
  // Impede embutir o site em iframes (clickjacking)
  { key: 'X-Frame-Options', value: 'DENY' },
  // Impede MIME-sniffing de respostas
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Proteção XSS legada (browsers antigos)
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // Controla o que é enviado como Referrer
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Desabilita features do browser que o site não usa
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  // Impede que janelas de outra origem acessem window deste site
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // credentialless: permite imagens externas sem CORP header, mas sem credenciais
  { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
  // Política de conteúdo completa
  { key: 'Content-Security-Policy', value: CSP },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'yt3.googleusercontent.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'yt3.ggpht.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
