'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Users, ArrowRight, Utensils, Clock, ShoppingBag } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        router.push('/dashboard');
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-rust border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-cream overflow-hidden">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-rust rounded-lg flex items-center justify-center">
            <Utensils className="w-4 h-4 text-cream" />
          </div>
          <span className="font-display text-xl font-bold text-charcoal">TableDrop</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/auth/login"
            className="text-sm text-stone hover:text-charcoal font-medium transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="bg-charcoal text-cream text-sm font-medium px-4 py-2 rounded-full hover:bg-rust transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-8 pt-16 pb-24">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-rust-light text-rust text-xs font-medium px-3 py-1.5 rounded-full mb-6 border border-rust/20">
            <span className="w-1.5 h-1.5 bg-rust rounded-full animate-pulse" />
            Group ordering made simple
          </div>

          <h1 className="font-display text-6xl md:text-7xl font-bold text-charcoal leading-[1.05] mb-6">
            Order together,
            <br />
            <span className="text-gradient italic">eat together.</span>
          </h1>

          <p className="text-lg text-stone max-w-xl mb-10 leading-relaxed">
            Create a group order, invite your crew, and let everyone pick their meal.
            No more back-and-forth texts. One order. One checkout.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 bg-rust text-cream font-medium px-6 py-3 rounded-full hover:bg-rust-dark transition-colors group"
            >
              Start a group order
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 border border-stone/30 text-charcoal font-medium px-6 py-3 rounded-full hover:border-charcoal transition-colors"
            >
              Sign in to join
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-20">
          {[
            {
              icon: Users,
              title: 'Invite your squad',
              desc: 'Send invite links to up to 3 friends. They join, you eat.',
              color: 'bg-sage/10 text-sage',
            },
            {
              icon: ShoppingBag,
              title: 'Everyone picks',
              desc: 'Browse the menu and add to your personal cart in real-time.',
              color: 'bg-rust/10 text-rust',
            },
            {
              icon: Clock,
              title: 'Host checks out',
              desc: 'When everyone\'s ready, the host places the order for the whole group.',
              color: 'bg-gold/20 text-gold',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-cream-dark border border-stone/15 rounded-2xl p-6 card-hover"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${feature.color}`}>
                <feature.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-charcoal mb-2">{feature.title}</h3>
              <p className="text-sm text-stone leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone/15 py-8 px-8 text-center text-sm text-stone">
        <span className="font-display italic">TableDrop</span> — Group Ordering Experience
      </footer>
    </main>
  );
}
