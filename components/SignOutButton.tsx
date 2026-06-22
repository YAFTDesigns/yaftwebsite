'use client';

import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase/browser';

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await getSupabaseBrowser().auth.signOut();
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <button type="button" className="btn-ghost" onClick={handleSignOut}>
      Sign out
    </button>
  );
}
