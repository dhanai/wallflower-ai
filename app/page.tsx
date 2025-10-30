import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  let user = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (error) {
    // Supabase not configured yet - continue without user
    console.log('Supabase not configured:', error);
  }

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold">
            Wallflower AI
          </Link>
          <nav className="flex gap-4">
            {user && user.id ? (
              <>
                <Link href="/designs" className="hover:underline">My Designs</Link>
                <Link href="/editor" className="hover:underline">Create Design</Link>
                <form action="/auth/signout" method="post" className="inline">
                  <button type="submit" className="hover:underline">Sign Out</button>
                </form>
              </>
            ) : (
              <>
                <Link href="/auth/signin" className="hover:underline">Sign In</Link>
                <Link href="/auth/signup" className="hover:underline">Sign Up</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-6xl font-semibold mb-4 tracking-tight">
          Create Custom T-Shirt<br />Designs with AI
        </h1>
        <p className="text-xl text-gray-600 mb-8 font-light">
          Choose a design, edit with AI, remove backgrounds, and order your custom t-shirt
        </p>
        {user ? (
          <Link
            href="/editor"
            className="inline-block bg-[#1d1d1f] text-white px-8 py-3 rounded-full hover:bg-[#2d2d2f] transition-all font-medium tracking-tight"
          >
            Create Your Design
          </Link>
        ) : (
          <Link
            href="/editor"
            className="inline-block bg-[#1d1d1f] text-white px-8 py-3 rounded-full hover:bg-[#2d2d2f] transition-all font-medium tracking-tight"
          >
            Get Started
          </Link>
        )}
      </section>
    </main>
  );
}