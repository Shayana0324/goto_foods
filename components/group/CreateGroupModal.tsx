'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
  onCreated: (groupId: string) => void;
}

export default function CreateGroupModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('group_orders')
      .insert({
        host_id: user.id,
        name: name || 'Group Order',
        status: 'open',
        max_participants: 3,
      })
      .select()
      .single();

    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data) {
      onCreated(data.id);
    }
  };

  const suggestions = ['Friday Lunch', 'Office Order', 'Weekend Feast', 'The Usual'];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-cream rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-bold text-charcoal">New group order</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone hover:text-charcoal hover:bg-stone/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1.5">
              Order name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Give your order a name..."
              maxLength={50}
              className="w-full px-4 py-3 rounded-xl border border-stone/25 bg-cream text-charcoal placeholder:text-stone/60 focus:border-rust focus:ring-1 focus:ring-rust focus:outline-none transition-colors text-sm"
            />
          </div>

          <div>
            <p className="text-xs text-stone mb-2">Quick picks:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setName(s)}
                  className="text-xs px-3 py-1.5 bg-cream-dark border border-stone/20 rounded-full text-charcoal hover:border-rust hover:text-rust transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-cream-dark rounded-xl p-4 text-sm text-stone">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-charcoal">Up to 3 participants</span>
            </div>
            You'll be the host and can invite 3 friends to add their items.
            Only you can check out.
          </div>

          {error && (
            <p className="text-rust text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rust text-cream font-medium py-3 rounded-xl hover:bg-rust-dark transition-colors disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" />
                Creating...
              </span>
            ) : 'Create group order'}
          </button>
        </form>
      </div>
    </div>
  );
}
