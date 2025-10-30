import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      redirect('/editor');
    }
  } catch (e) {
    // fall through to signin
  }
  redirect('/auth/signin');
}