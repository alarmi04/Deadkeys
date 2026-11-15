import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
