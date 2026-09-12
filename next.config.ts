import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Packages that must run in Node rather than be bundled: they reach for
  // native modules (`pg` needs `util/types`) or ship large binaries that
  // Turbopack should not try to trace into the client graph.
  serverExternalPackages: [
    "pg",
    "@prisma/adapter-pg",
    "@prisma/client",
    "@react-pdf/renderer",
    "exceljs",
    "bcryptjs",
  ],

  // Tree-shake the icon and chart barrels so a page importing three icons does
  // not pull in the whole set.
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
  },

  images: {
    // Only the Cloudinary account configured in the environment.
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
    formats: ["image/webp"],
  },

  // The version is an implementation detail worth not advertising.
  poweredByHeader: false,

  // Security headers are set in `src/proxy.ts`, which also sees the request
  // and can vary them; keeping them in one place avoids drift.
};

export default nextConfig;
