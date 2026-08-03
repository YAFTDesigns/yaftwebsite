import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdfkit'],
  async redirects() {
    // These .html URLs are from the old static GitHub Pages site,
    // before the migration to Next.js. Google indexed them back then
    // and they still carry whatever backlinks/history they earned,
    // but the new site serves clean URLs with no .html, so Search
    // Console started flagging them as 404s. Permanent redirects
    // instead of leaving them dead so that history transfers to the
    // new URLs rather than just being lost.
    return [
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/courses.html', destination: '/courses', permanent: true },
      { source: '/services.html', destination: '/services', permanent: true },
      { source: '/faculty.html', destination: '/faculty', permanent: true },
      { source: '/resources.html', destination: '/resources', permanent: true },
      { source: '/projects.html', destination: '/projects', permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/site-images/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/public-assets/**",
      },
    ],
  },
};

export default nextConfig;
