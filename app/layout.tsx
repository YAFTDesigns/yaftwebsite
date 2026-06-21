import type { Metadata } from "next";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import "./globals.css";

export const metadata: Metadata = {
  title: "YAFT Designs",
  description: "Computational design training & consulting — Rhino3D, Grasshopper, Rhino.Inside.Revit",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AnalyticsTracker />
        {children}
      </body>
    </html>
  );
}
