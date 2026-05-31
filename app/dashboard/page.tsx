'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { GroupOrder, Profile } from '@/types';
import { Plus, LogOut, Utensils, Users, ChevronRight, Clock } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import CreateGroupModal from '@/components/group/CreateGroupModal';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(null);
  const [groups, setGroups] = useState<GroupOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.push('/auth/login');
        return;
      }

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      setUser(profile);

      // Fetch group orders (hosted + participating)
      const { data: hostedGroups } = await supabase
        .from('group_orders')
        .select('*')
        .eq('host_id', data.user.id)
        .order('created_at', { ascending: false });

      const { data: participantGroups } = await supabase
        .from('group_orders')
        .select('*, group_participants!inner(user_id)')
        .eq('group_participants.user_id', data.user.id)
        .neq('host_id', data.user.id)
        .order('created_at', { ascending: false });

      const allGroups = [
        ...(hostedGroups || []),
        ...(participantGroups || []),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setGroups(allGroups);
      setLoading(false);
    });
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleGroupCreated = (groupId: string) => {
    setShowCreate(false);
    router.push(`/order/${groupId}`);
  };

  const statusConfig = {
    open: { label: 'Active', color: 'text-sage bg-sage/10', dot: 'bg-sage' },
    locked: { label: 'Locked', color: 'text-gold bg-gold/10', dot: 'bg-gold' },
    checked_out: { label: 'Completed', color: 'text-stone bg-stone/10', dot: 'bg-stone' },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-rust border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="border-b border-stone/15 bg-cream/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-rust rounded-md flex items-center justify-center">
              <Utensils className="w-3.5 h-3.5 text-cream" />
            </div>
            <span className="font-display text-lg font-bold text-charcoal">TableDrop</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium text-charcoal">{user?.display_name || 'You'}</div>
              <div className="text-xs text-stone">{user?.email}</div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-stone hover:text-charcoal hover:bg-stone/10 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-charcoal">
              Hey, {user?.display_name?.split(' ')[0] || 'there'} 👋
            </h1>
            <p className="text-stone mt-1">Ready to order with your crew?</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-rust text-cream font-medium px-5 py-2.5 rounded-full hover:bg-rust-dark transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            New group order
          </button>
        </div>

        {/* Groups list */}
        {groups.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-stone/20 rounded-2xl">
            <div className="text-5xl mb-4">🍽️</div>
            <h3 className="font-display text-xl font-semibold text-charcoal mb-2">No orders yet</h3>
            <p className="text-stone text-sm mb-6">Create a group order and invite your friends</p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 bg-rust text-cream font-medium px-5 py-2.5 rounded-full hover:bg-rust-dark transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Start a group order
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-stone mb-4">Your Orders</h2>
            {groups.map((group) => {
              const config = statusConfig[group.status];
              const isHost = user && group.host_id === user.id;

              return (
                <button
                  key={group.id}
                  onClick={() => router.push(`/order/${group.id}`)}
                  className="w-full bg-cream-dark border border-stone/15 rounded-2xl p-5 flex items-center gap-4 hover:border-stone/30 hover:shadow-sm transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-charcoal rounded-xl flex items-center justify-center flex-shrink-0 text-xl">
                    🍔
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-charcoal truncate">{group.name}</h3>
                      {isHost && (
                        <span className="text-xs bg-charcoal text-cream px-2 py-0.5 rounded-full flex-shrink-0">Host</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-stone">
                      <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full font-medium ${config.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                        {config.label}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(group.created_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {group.max_participants} max
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-stone group-hover:text-charcoal group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreated={handleGroupCreated}
        />
      )}
    </div>
  );
}
