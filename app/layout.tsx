import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from "@/contexts/LanguageContext";

export const metadata: Metadata = {
  title: "TripCopilot",
  description: "Tu viaje completo · Riesgo de conexión y estado de aeropuertos en tiempo real",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TripCopilot",
  },
};

export const viewport: Viewport = {
  themeColor: "#080810",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",   // enables safe-area-inset-* on iOS
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/tripcopliot-avatar.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/tripcopliot-avatar.svg" />
      </head>
      <body className="min-h-screen bg-gray-950 text-gray-100 antialiased">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
