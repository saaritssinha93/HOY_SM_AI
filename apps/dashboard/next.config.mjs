/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow workspace packages to be transpiled
  transpilePackages: ["@hoy/shared", "@hoy/control"],

  experimental: {
    // Server actions are GA in Next 15 but explicit allowlist is safer
    serverActions: {
      allowedOrigins: ["*"],
    },
  },

  // Cloudflare Pages — most edge runtime needs `export const runtime = "edge"`
  // on each route file. We do that per-page, not globally.
};

export default nextConfig;
