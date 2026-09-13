import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";

import { ThemeScript } from "@/components/layout/theme";
import { SuccessPopupHost } from "@/components/ui/success-popup";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Nutan Tech Solutions",
    template: "%s · NTS",
  },
  description:
    "Operations and HR platform for Nutan Tech Solutions — CNC maintenance, retrofitting, automation and robotics.",
  applicationName: "NTS",
  // Icons come from the app/icon.png and app/apple-icon.png file conventions.
  // Internal tool — keep it out of search engines.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Never trap a user who needs to zoom into a dense table.
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1117" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="antialiased">
        {children}
        <SuccessPopupHost />
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: { borderRadius: "0.6rem", fontSize: "13.5px" },
          }}
        />
      </body>
    </html>
  );
}
