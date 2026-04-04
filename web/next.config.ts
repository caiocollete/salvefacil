import type { NextConfig } from "next";

/** No build, `API_URL` habilita proxy `/api-backend/*` → API (evita expor URL no bundle do cliente). */
const apiBase = (
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL
)?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    if (!apiBase) return [];
    return [
      {
        source: "/api-backend/:path*",
        destination: `${apiBase}/:path*`,
      },
    ];
  },
};

export default nextConfig;
