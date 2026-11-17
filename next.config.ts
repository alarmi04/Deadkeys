import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// CSP sin nonce (compatible con el renderizado estático). Google Analytics solo se carga tras el consentimiento.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Avatares de Steam, recursos de la API e imágenes de las notas de parche se cargan directamente.
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  /* config options here */
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // El panel de administración no debe guardarse en cachés intermedias ni del navegador.
      { source: "/:lang/admin", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
  cacheComponents: true,
  // Rendimiento pasó al menú de herramientas: los enlaces antiguos siguen funcionando.
  async redirects() {
    return [
      { source: "/rendimiento", destination: "/herramientas/rendimiento/complock", permanent: true },
      { source: "/rendimiento/complock", destination: "/herramientas/rendimiento/complock", permanent: true },
      // El comparador pasó a ser parte del tracker de jugadores.
      { source: "/herramientas/comparar", destination: "/tracker", permanent: true },
      { source: "/herramientas/rendimiento", destination: "/herramientas/rendimiento/complock", permanent: false },
    ];
  },
  partialPrefetching: true,
  images: {
    // Los retratos e iconos de la API no mandan Cache-Control: sin esto, cada imagen optimizada se
    // regenera cada 4 h. Cambian como mucho con los parches, así que se guardan 30 días.
    minimumCacheTTL: 2_592_000,
    remotePatterns: [
      { protocol: "https", hostname: "assets-bucket.deadlock-api.com" },
      { protocol: "https", hostname: "api.deadlock-api.com", pathname: "/v1/assets/**" },
      { protocol: "https", hostname: "avatars.steamstatic.com" },
      { protocol: "https", hostname: "clan.fastly.steamstatic.com" },
      { protocol: "https", hostname: "clan.akamai.steamstatic.com" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
