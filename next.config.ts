import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdfkit'],
  // Never ship source maps to the browser: they expose readable source.
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        // Opt-out signals for AI training and image scraping. Unknown
        // directives are ignored by search engines, so indexing is unchanged.
        source: '/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noai, noimageai' }],
      },
      {
        // Browser protections. CSP is report-only first so nothing can break;
        // check the browser console on key pages, then switch to enforcing.
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          { key: 'Content-Security-Policy-Report-Only', value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://www.googletagmanager.com https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' blob: https:; connect-src 'self' https://*.supabase.co https://*.razorpay.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://vitals.vercel-insights.com https://va.vercel-scripts.com; frame-src https://api.razorpay.com https://checkout.razorpay.com https://www.youtube.com https://www.youtube-nocookie.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'" },
        ],
      },
      {
        // Private share links: never leak the token in a Referer header.
        source: '/:section(client-jobs|team-jobs)/:path*',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noai, noimageai' },
        ],
      },
    ];
  },
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
