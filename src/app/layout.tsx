import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import { InstallPrompt } from "@/components/InstallPrompt";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FitMomGuide",
  description:
    "Custom monthly meals, home workouts, and Blinkit-ready groceries for working moms.",
  applicationName: "FitMomGuide",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "FitMomGuide",
    statusBarStyle: "default",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#1F4D3A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full antialiased">
        <AuthProvider>
          <PwaRegister />
          <InstallPrompt />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
