import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/courses', '/services', '/faculty', '/projects', '/resources'];
  return routes.map((path) => ({ url: `https://yaftdesigns.com${path}` }));
}
