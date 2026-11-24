import type { NextConfig } from "next";

/**
 * Next 16 bloquea por defecto los recursos de dev (_next/hmr, bundles JS) si el Host de la
 * petición no está en esta lista - página en blanco al abrir el portal por la IP de LAN en vez
 * de localhost. Se deriva de NEXT_PUBLIC_API_URL (ya actualizado por
 * infrastructure/fix-network.ps1 en cada cambio de red) para no mantener una IP fija aparte.
 */
function hostDeApiUrl(): string | undefined {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "").hostname || undefined;
  } catch {
    return undefined;
  }
}

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: [hostDeApiUrl()].filter((host): host is string => Boolean(host)),
  experimental: {
    agentUpgrade: "security",
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
