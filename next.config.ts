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
      // Every canonical tag, OG tag, and metadataBase in this app points
      // to https://www.yaftdesigns.com -- but nothing was actually
      // enforcing that at the domain level, so the bare yaftdesigns.com
      // served identical content with no redirect between the two.
      // Google saw two live URLs for every page and picked its own
      // canonical instead of respecting the declared one (Search
      // Console: "Duplicate, Google chose different canonical than
      // user"). This forces the bare domain to redirect to www,
      // matching what every page already claims as canonical.
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'yaftdesigns.com' }],
        destination: 'https://www.yaftdesigns.com/:path*',
        permanent: true,
      },
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
