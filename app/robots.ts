import type { MetadataRoute } from 'next';

// Crawlers that collect pages to train AI models or to build lookalike
// datasets. Ordinary search engines (Googlebot, Bingbot) and link-preview
// bots are deliberately NOT listed, so SEO is unaffected. This is a request
// that well-behaved bots honour; it cannot stop a determined scraper.
const AI_TRAINING_CRAWLERS = [
  'GPTBot',
  'CCBot',
  'ClaudeBot',
  'anthropic-ai',
  'Google-Extended',
  'Applebot-Extended',
  'Bytespider',
  'Meta-ExternalAgent',
  'FacebookBot',
  'cohere-ai',
  'Diffbot',
  'ImagesiftBot',
  'Omgilibot',
  'Amazonbot',
  'AI2Bot',
  'PanguBot',
  'Timpibot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/api'] },
      { userAgent: AI_TRAINING_CRAWLERS, disallow: '/' },
    ],
    sitemap: 'https://www.yaftdesigns.com/sitemap.xml',
  };
}
