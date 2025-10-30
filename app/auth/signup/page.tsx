'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      // Create user profile
      if (data.user) {
        await supabase.from('users').insert({
          id: data.user.id,
          email: data.user.email,
          full_name: fullName,
        });
      }

      router.push('/');
      router.refresh();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      setLoading(true);
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
        },
      });
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#e9e5f0]">
      <div className="w-full max-w-5xl bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left: Form */}
          <div className="p-8 md:p-12">
            <div className="mb-8 flex items-center gap-2 text-sm text-gray-700">
              <span className="inline-block w-2 h-2 rounded-full bg-black" />
              <span className="font-semibold">Wallflower</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold mb-2 tracking-tight">Create your account</h1>
            <p className="text-gray-500 mb-8">Join and start creating AI-powered t‑shirt designs.</p>

            <form className="space-y-4" onSubmit={handleSignUp}>
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium">Full Name</label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Jane Doe"
                  className="mt-1 block w-full px-4 py-3 bg-white text-[#1d1d1f] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed]/30 transition-all placeholder:text-gray-400"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="mt-1 block w-full px-4 py-3 bg-white text-[#1d1d1f] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed]/30 transition-all placeholder:text-gray-400"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="mt-1 block w-full px-4 py-3 bg-white text-[#1d1d1f] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed]/30 transition-all placeholder:text-gray-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#7c3aed] text-white px-6 py-3 rounded-xl hover:bg-[#6d28d9] disabled:opacity-30 font-medium tracking-tight transition-all"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>

            <div className="mt-4">
              <button
                onClick={handleGoogleSignUp}
                disabled={loading}
                className="w-full bg-white text-[#1d1d1f] border border-gray-200 px-6 py-3 rounded-xl hover:bg-gray-50 disabled:opacity-30 font-medium tracking-tight transition-all inline-flex items-center justify-center gap-2"
                title="Continue with Google"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 s5.373-12,12-12c3.059,0,5.842,1.155,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24 s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,16.072,19.007,13,24,13c3.059,0,5.842,1.155,7.961,3.039l5.657-5.657 C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c4.698,0,8.999-1.802,12.252-4.735l-5.657-5.657C28.614,35.091,26.392,36,24,36 c-5.202,0-9.619-3.324-11.28-7.958l-6.55,5.047C9.586,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.793,2.237-2.231,4.166-4.084,5.608 c0.001-0.001,0.002-0.001,0.003-0.002l6.553,5.053C35.666,41.861,44,36,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
                Continue with Google
              </button>
            </div>

            <p className="mt-6 text-center text-sm text-gray-500">
              Already have an account? <a href="/auth/signin" className="text-[#7c3aed] hover:underline">Sign in</a>
            </p>
          </div>

          {/* Right: Visual */}
          <div className="hidden md:block relative bg-white/60">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 rounded-full bg-gradient-to-b from-[#7c3aed] to-[#6d28d9] shadow-2xl shadow-[#7c3aed]/40 translate-y-6" />
            </div>
            <div className="pt-[56.25%]" />
          </div>
        </div>
      </div>
    </div>
  );
}
