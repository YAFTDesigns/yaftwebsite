import { getSiteImageUrl } from './supabase/storage';

/**
 * Resolves a service_images.image_path value to an actual, usable
 * URL. Two valid forms exist, by design, not by accident: a leading
 * "/" means a real file already sitting in /public (how the 4 images
 * were seeded, since none of them were ever in Supabase Storage and
 * there's no way to upload them there directly from this codebase's
 * own tooling); anything else is a relative object path in the
 * site-images Storage bucket (what every future upload through the
 * admin panel produces, same bucket workshop photos already use).
 * Centralized here so the admin preview and the public page can never
 * resolve the same value two different ways.
 */
export function resolveServiceImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null;
  if (imagePath.startsWith('/')) return imagePath;
  return getSiteImageUrl(imagePath);
}
