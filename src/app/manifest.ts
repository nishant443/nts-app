import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "NTS Operations & HR Platform",
    short_name: "NTS",
    description:
      "Nutan Tech Solutions — customers, daily work, payments and HR.",
    // The branded launch screen; it forwards to /dashboard.
    start_url: "/launch.html",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    theme_color: "#ffffff",
    background_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
