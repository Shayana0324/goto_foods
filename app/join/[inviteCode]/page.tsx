'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Utensils, Check, X, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function JoinPage() {
  const router = useRouter();
  const params = useParams();
  const inviteCode = params.inviteCode as string;

  const [status, setStatus] = useState<'loading' | 'joining' | 'success' | 'error' | 'auth_required'>('loading');
  const [message, setMessage] = useState('');
  const [groupId, setGroupId] = useState('');

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setStatus('auth_required');
        return;
      }

      setStatus('joining');

      // Call the join function
      const { data: result, error } = await supabase.rpc('join_group_by_invite_code', {
        p_invite_code: inviteCode,
      });

      if (error || !result?.success) {
        setStatus('error');
        setMessage(result?.error || error?.message || 'Failed to join group');
      } else {
        setGroupId(result.group_id);
        setStatus('success');
      }
    });
  }, [inviteCode]);

  if (status === 'auth_required') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-rust/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <Utensils className="w-7 h-7 text-rust" />
          </div>
          <h1 className="font-display text-2xl font-bold text-charcoal mb-3">
            Join this group order
          </h1>
          <p className="text-stone text-sm mb-6 leading-relaxed">
            You need an account to join this group order. It only takes a few seconds.
          </p>
          <div className="space-y-3">
            <Link
              href={`/auth/signup?redirectTo=/join/${inviteCode}`}
              className="flex items-center justify-center gap-2 w-full bg-rust text-cream font-medium py-3 rounded-xl hover:bg-rust-dark transition-colors"
            >
              Create account <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href={`/auth/login?redirectTo=/join/${inviteCode}`}
              className="flex items-center justify-center gap-2 w-full border border-stone/25 text-charcoal font-medium py-3 rounded-xl hover:border-charcoal transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'loading' || status === 'joining') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-rust border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone text-sm">
            {status === 'joining' ? 'Joining group order...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center animate-scale-in">
          <div className="w-16 h-16 bg-sage/15 rounded-full flex items-center justify-center mx-auto mb-5">
            <Check className="w-8 h-8 text-sage" />
          </div>
          <h1 className="font-display text-2xl font-bold text-charcoal mb-2">You're in! 🎉</h1>
          <p className="text-stone text-sm mb-6">
            You've joined the group order. Head over to pick your items!
          </p>
          <button
            onClick={() => router.push(`/order/${groupId}`)}
            className="flex items-center justify-center gap-2 w-full bg-rust text-cream font-medium py-3 rounded-xl hover:bg-rust-dark transition-colors"
          >
            Browse the menu <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Error
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center animate-scale-in">
        <div className="w-16 h-16 bg-rust/10 rounded-full flex items-center justify-center mx-auto mb-5">
          <X className="w-8 h-8 text-rust" />
        </div>
        <h1 className="font-display text-2xl font-bold text-charcoal mb-2">Couldn't join</h1>
        <p className="text-stone text-sm mb-6">{message || 'This invite link is invalid or expired.'}</p>
        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-2 w-full bg-charcoal text-cream font-medium py-3 rounded-xl hover:bg-rust transition-colors"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
