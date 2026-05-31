'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Utensils, ArrowLeft, Eye, EyeOff } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push(redirectTo);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-charcoal p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-16">
            <div className="w-8 h-8 bg-rust rounded-lg flex items-center justify-center">
              <Utensils className="w-4 h-4 text-cream" />
            </div>
            <span className="font-display text-xl font-bold text-cream">TableDrop</span>
          </div>
          <h2 className="font-display text-4xl text-cream leading-tight italic mb-4">
            "The only app where ordering pizza with friends doesn't end in chaos."
          </h2>
          <p className="text-stone text-sm">— Every group dinner, ever</p>
        </div>

        <div className="flex gap-3">
          {['🍔', '🌶️', '🍟', '🧀'].map((emoji, i) => (
            <div
              key={i}
              className="w-12 h-12 bg-charcoal border border-stone/20 rounded-xl flex items-center justify-center text-xl"
            >
              {emoji}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-stone hover:text-charcoal mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <h1 className="font-display text-3xl font-bold text-charcoal mb-2">Welcome back</h1>
          <p className="text-stone text-sm mb-8">Sign in to your TableDrop account</p>

          {searchParams.get('error') && (
            <div className="bg-rust/10 border border-rust/20 text-rust text-sm px-4 py-3 rounded-xl mb-6">
              Something went wrong. Please try again.
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-stone/25 bg-cream text-charcoal placeholder:text-stone/60 focus:border-rust focus:ring-1 focus:ring-rust focus:outline-none transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-stone/25 bg-cream text-charcoal placeholder:text-stone/60 focus:border-rust focus:ring-1 focus:ring-rust focus:outline-none transition-colors text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone hover:text-charcoal transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-rust text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rust text-cream font-medium py-3 rounded-xl hover:bg-rust-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-stone mt-6">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="text-rust hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream" />}>
      <LoginForm />
    </Suspense>
  );
}
