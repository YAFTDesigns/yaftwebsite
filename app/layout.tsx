import type { Metadata } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import "./globals.css";

const GA_MEASUREMENT_ID = "G-XXXXXXXXXX"; // TODO: replace with your real GA4 Measurement ID

export const metadata: Metadata = {
  metadataBase: new URL("https://yaftdesigns.com"),
  title: {
    default: "YAFT Designs — Computational Design Training & Consulting",
    template: "%s | YAFT Designs",
  },
  description:
    "Authorized Rhino3D Training in India. Rhino3D, Grasshopper, BIM Consulting, Computational Design and Parametric Design services.",
  keywords: [
    "Rhino3D Training India",
    "Grasshopper Training India",
    "Computational Design",
    "BIM Consulting",
    "Parametric Design",
    "Rhino Authorized Trainer India",
  ],
  authors: [{ name: "YAFT Designs" }],
  openGraph: {
    title: "YAFT Designs",
    description: "Rhino3D, Grasshopper, Computational Design & BIM Consulting",
    url: "https://yaftdesigns.com",
    type: "website",
  },
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
        <SpeedInsights />
      </body>
    </html>
  );
}
