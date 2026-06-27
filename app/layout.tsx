import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import "./globals.css";

const GA_MEASUREMENT_ID = "G-XDVDJC7X24";

export const metadata: Metadata = {
  metadataBase: new URL("https://yaftdesigns.com"),
  title: {
    default: "Authorized Rhino3D Trainer India | Grasshopper Training | YAFT Designs",
    template: "%s | YAFT Designs",
  },
  description:
    "Authorized Rhino3D Training in India. Rhino3D, Grasshopper, BIM Consulting, Computational Design and Parametric Design services.",
  authors: [{ name: "YAFT Designs" }],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: { url: "/favicon-512.png", sizes: "512x512", type: "image/png" },
  },
  openGraph: {
    title: "Authorized Rhino3D Trainer India | Grasshopper Training | YAFT Designs",
    description: "Authorized Rhino3D Training in India. Rhino3D, Grasshopper, BIM Consulting, Computational Design and Parametric Design services.",
    url: "https://yaftdesigns.com",
    type: "website",
    images: [{ url: "https://yaftdesigns.com/favicon-512.png", width: 512, height: 512, alt: "YAFT Designs" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Authorized Rhino3D Trainer India | Grasshopper Training | YAFT Designs",
    description: "Authorized Rhino3D Training in India. Rhino3D, Grasshopper, BIM Consulting, Computational Design and Parametric Design services.",
    images: ["https://yaftdesigns.com/favicon-512.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`}
        </Script>
        <AnalyticsTracker />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
