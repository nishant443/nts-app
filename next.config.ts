import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "pg",
    "@prisma/adapter-pg",
    "@prisma/client",
    "@react-pdf/renderer",
    "exceljs",
    "bcryptjs",
  ],

  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
    formats: ["image/webp"],
  },

  poweredByHeader: false,
};

export default nextConfig;
