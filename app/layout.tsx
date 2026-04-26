import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import "flag-icons/css/flag-icons.min.css";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Providers } from "@/components/Providers";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "700", "800"],
});

export const metadata: Metadata = {
  title: { default: "TripCopilot", template: "%s | TripCopilot" },
  description:
    "Monitoreo de vuelos en tiempo real. Alertas de demoras FAA, importá tu boarding pass con IA, y gestioná todos tus viajes.",
  keywords: [
    "vuelos",
    "viajes",
    "demoras",
    "FAA",
    "boarding pass",
    "alertas",
    "tiempo real",
  ],
  authors: [{ name: "TripCopilot" }],
  creator: "TripCopilot",
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "https://tripcopilot.app",
    siteName: "TripCopilot",
    title: "TripCopilot — Monitoreo de vuelos en tiempo real",
    description:
      "Alertas de demoras, importá tu boarding pass con IA, gestioná tus viajes.",
    images: [
      { url: "/og-image.png", width: 1200, height: 630, alt: "TripCopilot" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TripCopilot",
    description: "Monitoreo de vuelos en tiempo real con IA",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
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
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} dark`}>
      <head>
        <link rel="icon" href="/tripcopliot-avatar.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <Providers>
          <ThemeProvider>
            <LanguageProvider>{children}</LanguageProvider>
          </ThemeProvider>
        </Providers>
        <Analytics />
        <SpeedInsights />
        <Script
          id="ms-clarity"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script","whz2qtpiod");`,
          }}
        />
      </body>
    </html>
  );
}
