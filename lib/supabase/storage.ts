import { getSupabasePublic } from './public';

export function getSiteImageUrl(objectPath: string): string {
  return getSupabasePublic().storage.from('site-images').getPublicUrl(objectPath).data.publicUrl;
}
