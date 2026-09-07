import type { MetadataRoute } from 'next';

// Scoped specifically for "install the admin panel as an app on my
// phone" (start_url -> /admin), not a general public-site PWA. Uses
// the existing favicon-192/512 assets (real, already-branded "YD"
// icons) rather than new placeholder art, and the site's actual
// --paper/--brass/--ink values from globals.css rather than guessed
// colors, so the install splash screen and app-switcher tile
// genuinely match the rest of the site.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'YAFT Designs Admin',
    short_name: 'YAFT Admin',
    description: 'Admin dashboard for YAFT Designs -- leads, invoices, Labs, and site content.',
    start_url: '/admin',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#0A0A0A',
    theme_color: '#0A0A0A',
    icons: [
      { src: '/favicon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/favicon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/favicon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/favicon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
