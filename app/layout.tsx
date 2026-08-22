import type { Metadata, Viewport } from "next";
import ProductionOnlyAnalytics from "@/components/ProductionOnlyAnalytics";
import WhatsAppButton from "@/components/WhatsAppButton";
import WhatsAppGateModal from "@/components/WhatsAppGateModal";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.yaftdesigns.com"),
  title: {
    default: "YAFT Designs | Authorized Rhino3D Trainer India, Grasshopper Training Asia Pacific and Middle East",
    template: "%s | YAFT Designs",
  },
  description:
    "Authorized Rhino3D Training Center in India. Rhino3D, Grasshopper, BIM and Computational Design training online for architects and designers across India, Australia, Singapore, UAE, Indonesia, Philippines and Japan.",
  authors: [{ name: "YAFT Designs" }],
  verification: {
    google: "Nzk_mrqn6LX23Lb2ZJnbz2FfLSEOsBFEpC_pC5I_nVU",
  },
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
    url: "https://www.yaftdesigns.com",
    type: "website",
    images: [{ url: "https://www.yaftdesigns.com/assets/images/og-image.jpg", width: 1200, height: 630, alt: "YAFT Designs — Authorized Rhino Training Center India" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Authorized Rhino3D Trainer India | Grasshopper Training | YAFT Designs",
    description: "Authorized Rhino3D Training in India. Rhino3D, Grasshopper, BIM Consulting, Computational Design and Parametric Design services.",
    images: ["https://www.yaftdesigns.com/assets/images/og-image.jpg"],
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
        <ProductionOnlyAnalytics />
        {children}
        <WhatsAppButton />
        <WhatsAppGateModal />
      </body>
    </html>
  );
}
