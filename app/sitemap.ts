import type { MetadataRoute } from 'next';

const BASE = 'https://yaftdesigns.com';
const NOW = new Date().toISOString();

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}`,           lastModified: NOW, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE}/courses`,   lastModified: NOW, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${BASE}/services`,  lastModified: NOW, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/faculty`,   lastModified: NOW, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/projects`,  lastModified: NOW, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/resources`, lastModified: NOW, changeFrequency: 'monthly', priority: 0.6 },
  ];
}
