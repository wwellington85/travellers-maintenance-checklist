import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { withBasePath } from "@/lib/app-path";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Travellers Maintenance",
  description: "Night maintenance checklist and management dashboard.",
  applicationName: "Travellers Maintenance",
  manifest: withBasePath("/manifest.webmanifest"),
  icons: {
    icon: [
      { url: withBasePath("/icons/icon-192"), sizes: "192x192", type: "image/png" },
      { url: withBasePath("/icons/icon-512"), sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: withBasePath("/icons/apple-touch"), sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Travellers Maintenance",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
