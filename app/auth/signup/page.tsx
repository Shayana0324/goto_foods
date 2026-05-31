'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Utensils, ArrowLeft, Eye, EyeOff, Check } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-8">
        <div className="max-w-sm text-center animate-scale-in">
          <div className="w-16 h-16 bg-sage/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-sage" />
          </div>
          <h2 className="font-display text-2xl font-bold text-charcoal mb-3">Check your email</h2>
          <p className="text-stone text-sm leading-relaxed mb-6">
            We sent a confirmation link to <strong className="text-charcoal">{email}</strong>.
            Click it to activate your account and start ordering.
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 bg-rust text-cream font-medium px-6 py-3 rounded-full hover:bg-rust-dark transition-colors text-sm"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

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
          <h2 className="font-display text-4xl text-cream leading-tight mb-6">
            Group orders,
            <br />
            <span className="italic text-gold">zero friction.</span>
          </h2>
          <div className="space-y-3">
            {[
              'Create an order in seconds',
              'Invite up to 3 friends',
              'Everyone picks their meal',
              'Host places the final order',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-sage/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-sage" />
                </div>
                <span className="text-stone text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-stone text-xs">
          Built with ❤️ for group dining
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

          <h1 className="font-display text-3xl font-bold text-charcoal mb-2">Create account</h1>
          <p className="text-stone text-sm mb-8">Join TableDrop and start ordering together</p>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">Your name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Jane Smith"
                required
                className="w-full px-4 py-3 rounded-xl border border-stone/25 bg-cream text-charcoal placeholder:text-stone/60 focus:border-rust focus:ring-1 focus:ring-rust focus:outline-none transition-colors text-sm"
              />
            </div>

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
                  placeholder="At least 8 characters"
                  minLength={8}
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
                  Creating account...
                </span>
              ) : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-stone mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-rust hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
