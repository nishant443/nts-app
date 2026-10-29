import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";

import { ThemeScript } from "@/components/layout/theme";
import { ServiceWorkerManager } from "@/components/pwa/service-worker-manager";
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
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    title: "NTS",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  // A single tag that ThemeScript retunes to the app's own theme, so the
  // phone's status bar matches the top bar even when the app and the phone
  // are set to different themes.
  themeColor: "#ffffff",
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
        <ServiceWorkerManager />
        <Toaster
          position="top-right"
          richColors
          closeButton
          swipeDirections={["left", "right", "top"]}
          toastOptions={{
            style: { borderRadius: "0.6rem", fontSize: "13.5px" },
          }}
        />
      </body>
    </html>
  );
}
