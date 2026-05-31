'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GroupOrder, GroupParticipant } from '@/types';
import { X, Mail, Copy, Check, Users, Link2 } from 'lucide-react';

interface Props {
  group: GroupOrder;
  participants: GroupParticipant[];
  onClose: () => void;
  onInvited: () => void;
}

export default function InviteModal({ group, participants, onClose, onInvited }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const activeParticipants = participants.filter(p => p.status !== 'declined');
  // Host counts as 1, so max additional is max_participants - 1
  const canInviteMore = activeParticipants.length < (group.max_participants - 1);

  const inviteLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${group.invite_code}`;

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canInviteMore) return;
    setLoading(true);
    setError('');
    setSuccess('');

    const supabase = createClient();

    // Look up user by email
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.toLowerCase().trim());

    const invitedProfile = profiles?.[0];

    if (!invitedProfile) {
      setError('No user found with that email. They need to create an account first.');
      setLoading(false);
      return;
    }

    // Check if already in group
    const alreadyIn = participants.find(p => p.user_id === invitedProfile.id);
    if (alreadyIn) {
      setError('This person is already in your group order.');
      setLoading(false);
      return;
    }

    // Insert participant
    const { error: insertError } = await supabase.from('group_participants').insert({
      group_id: group.id,
      user_id: invitedProfile.id,
      invited_email: email.toLowerCase().trim(),
      status: 'invited',
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setSuccess(`Invited ${invitedProfile.display_name || email}! They can join using the link.`);
      setEmail('');
      onInvited();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-cream rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-bold text-charcoal">Invite to your order</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-stone hover:text-charcoal hover:bg-stone/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Capacity indicator */}
        <div className="bg-cream-dark rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-charcoal flex items-center gap-2">
              <Users className="w-4 h-4 text-stone" />
              Group capacity
            </span>
            <span className="text-sm font-semibold text-charcoal">
              {activeParticipants.length + 1}/{group.max_participants}
            </span>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: group.max_participants }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full ${
                  i === 0 ? 'bg-rust' :
                  i <= activeParticipants.length ? 'bg-sage' :
                  'bg-stone/20'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-stone mt-2">
            {canInviteMore
              ? `You can invite ${group.max_participants - 1 - activeParticipants.length} more participant${group.max_participants - 1 - activeParticipants.length !== 1 ? 's' : ''}`
              : 'Group is full'}
          </p>
        </div>

        {/* Share link */}
        <div className="mb-5">
          <p className="text-sm font-medium text-charcoal mb-2 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-stone" />
            Share invite link
          </p>
          <div className="flex gap-2">
            <div className="flex-1 bg-cream-dark border border-stone/20 rounded-xl px-3 py-2.5 text-xs text-stone font-mono truncate">
              {inviteLink}
            </div>
            <button
              onClick={copyLink}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                copiedLink
                  ? 'bg-sage/15 text-sage border border-sage/30'
                  : 'bg-charcoal text-cream hover:bg-rust'
              }`}
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedLink ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-stone/20" />
          <span className="text-xs text-stone">or invite by email</span>
          <div className="flex-1 h-px bg-stone/20" />
        </div>

        {/* Email invite */}
        <form onSubmit={handleInvite} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@example.com"
              disabled={!canInviteMore}
              required
              className="flex-1 px-4 py-3 rounded-xl border border-stone/25 bg-cream text-charcoal placeholder:text-stone/60 focus:border-rust focus:ring-1 focus:ring-rust focus:outline-none transition-colors text-sm disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !canInviteMore}
              className="flex-shrink-0 flex items-center gap-1.5 bg-rust text-cream font-medium px-4 py-3 rounded-xl hover:bg-rust-dark transition-colors disabled:opacity-50 text-sm"
            >
              <Mail className="w-4 h-4" />
              Invite
            </button>
          </div>

          {error && <p className="text-rust text-xs">{error}</p>}
          {success && <p className="text-sage text-xs flex items-center gap-1.5"><Check className="w-3 h-3" />{success}</p>}
        </form>

        {/* Current participants */}
        {participants.length > 0 && (
          <div className="mt-5 pt-4 border-t border-stone/15">
            <p className="text-xs font-semibold text-stone uppercase tracking-wide mb-3">Current participants</p>
            <div className="space-y-2">
              {participants.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${p.status === 'joined' ? 'bg-sage' : 'bg-stone/40'}`} />
                  <span className="text-sm text-charcoal truncate flex-1">
                    {p.profile?.display_name || p.profile?.email || p.invited_email}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    p.status === 'joined' ? 'bg-sage/15 text-sage' : 'bg-stone/10 text-stone'
                  }`}>
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
