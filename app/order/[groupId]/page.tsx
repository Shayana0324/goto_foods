'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  GroupOrder, GroupParticipant, MenuItem, OrderItem, Profile
} from '@/types';
import { formatPrice, getInitials, getAvatarColor } from '@/lib/utils';
import {
  ArrowLeft, Users, Link2, Plus, Minus, ShoppingCart,
  Trash2, Check, Lock, CreditCard, X, Copy, ChevronDown, ChevronUp
} from 'lucide-react';
import InviteModal from '@/components/group/InviteModal';
import CheckoutModal from '@/components/group/CheckoutModal';

export default function OrderPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;

  const [user, setUser] = useState<Profile | null>(null);
  const [group, setGroup] = useState<GroupOrder | null>(null);
  const [host, setHost] = useState<Profile | null>(null);
  const [participants, setParticipants] = useState<GroupParticipant[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showInvite, setShowInvite] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { router.push('/auth/login'); return; }

    // Profile
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
    setUser(profile);

    // Group
    const { data: groupData } = await supabase.from('group_orders').select('*').eq('id', groupId).single();
    if (!groupData) { router.push('/dashboard'); return; }
    setGroup(groupData);

    // Host profile
    const { data: hostData } = await supabase.from('profiles').select('*').eq('id', groupData.host_id).single();
    setHost(hostData);

    // Participants with profiles
    const { data: parts } = await supabase
      .from('group_participants')
      .select('*, profile:profiles(*)')
      .eq('group_id', groupId);
    setParticipants(parts || []);

    // Menu items
    const { data: menu } = await supabase.from('menu_items').select('*').eq('available', true).order('category');
    setMenuItems(menu || []);

    // Order items with menu item + profile
    const { data: items } = await supabase
      .from('order_items')
      .select('*, menu_item:menu_items(*), profile:profiles(*)')
      .eq('group_id', groupId);
    setOrderItems(items || []);

    setLoading(false);
  }, [groupId, router]);

  useEffect(() => {
    loadData();

    // Realtime subscriptions
    const supabase = createClient();
    const channel = supabase
      .channel(`group-${groupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items', filter: `group_id=eq.${groupId}` }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_participants', filter: `group_id=eq.${groupId}` }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_orders', filter: `id=eq.${groupId}` }, loadData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [groupId, loadData]);

  const isHost = user && group && user.id === group.host_id;
  const isOpen = group?.status === 'open';

  const myItems = orderItems.filter((item) => item.user_id === user?.id);
  const myTotal = myItems.reduce((sum, item) => sum + (item.menu_item?.price_cents || 0) * item.quantity, 0);
  const groupTotal = orderItems.reduce((sum, item) => sum + (item.menu_item?.price_cents || 0) * item.quantity, 0);

  const categories = ['all', ...Array.from(new Set(menuItems.map((m) => m.category)))];

  const filteredMenu = activeCategory === 'all'
    ? menuItems
    : menuItems.filter((m) => m.category === activeCategory);

  const getMyQuantity = (menuItemId: string) =>
    myItems.find((i) => i.menu_item_id === menuItemId)?.quantity || 0;

  const updateQuantity = async (menuItemId: string, delta: number) => {
    if (!user || !isOpen) return;
    const supabase = createClient();
    const existing = myItems.find((i) => i.menu_item_id === menuItemId);
    const newQty = (existing?.quantity || 0) + delta;

    if (newQty <= 0 && existing) {
      await supabase.from('order_items').delete().eq('id', existing.id);
    } else if (newQty > 0 && existing) {
      await supabase.from('order_items').update({ quantity: newQty }).eq('id', existing.id);
    } else if (newQty > 0) {
      await supabase.from('order_items').insert({ group_id: groupId, user_id: user.id, menu_item_id: menuItemId, quantity: 1 });
    }
    await loadData();
  };

  const copyInviteCode = () => {
    if (!group) return;
    const url = `${window.location.origin}/join/${group.invite_code}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Group items by user for the order summary panel
  const itemsByUser = orderItems.reduce<Record<string, { profile: Profile | undefined; items: OrderItem[] }>>(
    (acc, item) => {
      const uid = item.user_id;
      if (!acc[uid]) acc[uid] = { profile: item.profile, items: [] };
      acc[uid].items.push(item);
      return acc;
    }, {}
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-rust border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statusBadge = {
    open: <span className="flex items-center gap-1.5 text-xs bg-sage/15 text-sage px-2.5 py-1 rounded-full font-medium"><span className="w-1.5 h-1.5 bg-sage rounded-full animate-pulse-slow" />Active</span>,
    locked: <span className="flex items-center gap-1.5 text-xs bg-gold/15 text-gold px-2.5 py-1 rounded-full font-medium"><Lock className="w-3 h-3" />Locked</span>,
    checked_out: <span className="flex items-center gap-1.5 text-xs bg-stone/15 text-stone px-2.5 py-1 rounded-full font-medium"><Check className="w-3 h-3" />Completed</span>,
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="border-b border-stone/15 bg-cream/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button onClick={() => router.push('/dashboard')} className="p-2 rounded-lg text-stone hover:text-charcoal hover:bg-stone/10 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-lg font-bold text-charcoal truncate">{group?.name}</h1>
              {group && statusBadge[group.status]}
              {isHost && (
                <span className="text-xs bg-charcoal text-cream px-2 py-0.5 rounded-full">You're the host</span>
              )}
            </div>
            <p className="text-xs text-stone mt-0.5">
              {participants.length + 1}/{group?.max_participants} participants
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isHost && isOpen && (
              <button
                onClick={() => setShowInvite(true)}
                className="flex items-center gap-1.5 text-sm border border-stone/25 text-charcoal px-3 py-2 rounded-lg hover:border-charcoal transition-colors"
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Invite</span>
              </button>
            )}
            <button
              onClick={copyInviteCode}
              className="flex items-center gap-1.5 text-sm border border-stone/25 text-charcoal px-3 py-2 rounded-lg hover:border-charcoal transition-colors"
              title="Copy invite link"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-sage" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline font-mono text-xs">{group?.invite_code}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex gap-6">
        {/* Main content: Menu */}
        <div className="flex-1 min-w-0">
          {/* Category tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 text-sm px-4 py-2 rounded-full font-medium transition-colors capitalize ${
                  activeCategory === cat
                    ? 'bg-charcoal text-cream'
                    : 'bg-cream-dark text-stone hover:text-charcoal border border-stone/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Menu grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredMenu.map((item) => {
              const qty = getMyQuantity(item.id);
              return (
                <div
                  key={item.id}
                  className={`bg-cream-dark border rounded-2xl p-5 transition-all ${
                    qty > 0 ? 'border-rust/30 shadow-sm' : 'border-stone/15'
                  }`}
                >
                  <div className="flex gap-4">
                    <div className="w-14 h-14 bg-cream border border-stone/15 rounded-xl flex items-center justify-center text-3xl flex-shrink-0">
                      {item.image_emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-charcoal text-sm leading-tight">{item.name}</h3>
                          <p className="text-xs text-stone mt-0.5 line-clamp-2 leading-relaxed">{item.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="font-semibold text-charcoal">{formatPrice(item.price_cents)}</span>

                        {isOpen ? (
                          qty === 0 ? (
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="flex items-center gap-1.5 bg-rust text-cream text-xs font-medium px-3 py-1.5 rounded-full hover:bg-rust-dark transition-colors"
                            >
                              <Plus className="w-3 h-3" /> Add
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                className="w-7 h-7 rounded-full border border-stone/25 flex items-center justify-center text-charcoal hover:bg-stone/10 transition-colors"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-sm font-semibold text-charcoal w-4 text-center">{qty}</span>
                              <button
                                onClick={() => updateQuantity(item.id, 1)}
                                className="w-7 h-7 rounded-full bg-rust text-cream flex items-center justify-center hover:bg-rust-dark transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          )
                        ) : (
                          <span className="text-xs text-stone italic">Order closed</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: Order Summary (desktop) */}
        <aside className="hidden lg:block w-80 flex-shrink-0">
          <div className="sticky top-24 space-y-4">
            {/* Participants */}
            <div className="bg-cream-dark border border-stone/15 rounded-2xl p-5">
              <h3 className="font-semibold text-charcoal text-sm mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-stone" />
                Participants
              </h3>
              <div className="space-y-2.5">
                {/* Host */}
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ${getAvatarColor(host?.id || '')}`}>
                    {getInitials(host?.display_name, host?.email || '')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-charcoal truncate">{host?.display_name || host?.email}</p>
                    <p className="text-xs text-stone">Host</p>
                  </div>
                  <span className="text-xs font-medium text-charcoal">
                    {formatPrice(Object.values(itemsByUser).find((u) => u.profile?.id === host?.id)?.items.reduce((s, i) => s + (i.menu_item?.price_cents || 0) * i.quantity, 0) || 0)}
                  </span>
                </div>

                {/* Participants */}
                {participants.filter(p => p.status === 'joined').map((p) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ${getAvatarColor(p.user_id)}`}>
                      {getInitials(p.profile?.display_name, p.profile?.email || p.invited_email || '?')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-charcoal truncate">
                        {p.profile?.display_name || p.profile?.email || p.invited_email}
                        {p.user_id === user?.id && ' (you)'}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-charcoal">
                      {formatPrice(itemsByUser[p.user_id]?.items.reduce((s, i) => s + (i.menu_item?.price_cents || 0) * i.quantity, 0) || 0)}
                    </span>
                  </div>
                ))}

                {/* Invited (pending) */}
                {participants.filter(p => p.status === 'invited').map((p) => (
                  <div key={p.id} className="flex items-center gap-3 opacity-50">
                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-stone/40 flex items-center justify-center text-xs text-stone">?</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-stone truncate">{p.invited_email}</p>
                      <p className="text-xs text-stone/60">Pending</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order summary */}
            <div className="bg-cream-dark border border-stone/15 rounded-2xl p-5">
              <h3 className="font-semibold text-charcoal text-sm mb-4 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-stone" />
                Order Summary
              </h3>

              {orderItems.length === 0 ? (
                <p className="text-xs text-stone text-center py-4">No items yet</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(itemsByUser).map(([uid, { profile, items }]) => (
                    <div key={uid}>
                      <p className="text-xs font-semibold text-stone uppercase tracking-wide mb-2">
                        {profile?.display_name || profile?.email || 'Unknown'}
                        {uid === user?.id && ' (you)'}
                      </p>
                      <div className="space-y-1.5">
                        {items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between gap-2">
                            <span className="text-xs text-charcoal flex-1 truncate">
                              {item.quantity}× {item.menu_item?.name}
                            </span>
                            <span className="text-xs text-stone flex-shrink-0">
                              {formatPrice((item.menu_item?.price_cents || 0) * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="border-t border-stone/20 pt-3 flex justify-between items-center">
                    <span className="text-sm font-semibold text-charcoal">Group Total</span>
                    <span className="text-sm font-bold text-charcoal">{formatPrice(groupTotal)}</span>
                  </div>
                </div>
              )}

              {isHost && isOpen && (
                <button
                  onClick={() => setShowCheckout(true)}
                  disabled={orderItems.length === 0}
                  className="w-full mt-4 flex items-center justify-center gap-2 bg-charcoal text-cream font-medium py-3 rounded-xl hover:bg-rust transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <CreditCard className="w-4 h-4" />
                  Checkout Group Order
                </button>
              )}

              {!isHost && isOpen && myItems.length > 0 && (
                <div className="mt-4 bg-sage/10 border border-sage/20 rounded-xl p-3 text-xs text-sage text-center">
                  <Check className="w-3.5 h-3.5 inline mr-1" />
                  Your items are added! Waiting for the host to check out.
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile cart bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20">
        <div
          className={`bg-cream border-t border-stone/15 transition-all ${showCart ? 'max-h-screen' : 'max-h-20'}`}
        >
          {/* Toggle bar */}
          <button
            onClick={() => setShowCart(!showCart)}
            className="w-full flex items-center justify-between px-6 py-4"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="w-5 h-5 text-charcoal" />
                {myItems.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rust text-cream text-[10px] font-bold rounded-full flex items-center justify-center">
                    {myItems.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                )}
              </div>
              <span className="font-semibold text-charcoal text-sm">
                {myItems.length === 0 ? 'Your cart is empty' : `My total: ${formatPrice(myTotal)}`}
              </span>
            </div>
            {showCart ? <ChevronDown className="w-4 h-4 text-stone" /> : <ChevronUp className="w-4 h-4 text-stone" />}
          </button>

          {/* Cart content */}
          {showCart && (
            <div className="px-6 pb-6 space-y-3 max-h-96 overflow-y-auto">
              {myItems.length === 0 ? (
                <p className="text-sm text-stone text-center py-4">Browse the menu to add items</p>
              ) : (
                <>
                  {myItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <span className="text-lg">{item.menu_item?.image_emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-charcoal truncate">{item.menu_item?.name}</p>
                        <p className="text-xs text-stone">{formatPrice((item.menu_item?.price_cents || 0) * item.quantity)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQuantity(item.menu_item_id, -1)} className="w-7 h-7 rounded-full border border-stone/25 flex items-center justify-center hover:bg-stone/10 transition-colors">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-semibold w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.menu_item_id, 1)} className="w-7 h-7 rounded-full bg-rust text-cream flex items-center justify-center hover:bg-rust-dark transition-colors">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-stone/20 pt-3 flex justify-between">
                    <span className="font-semibold text-charcoal">Your total</span>
                    <span className="font-bold text-charcoal">{formatPrice(myTotal)}</span>
                  </div>
                  {isHost && (
                    <button
                      onClick={() => { setShowCart(false); setShowCheckout(true); }}
                      className="w-full flex items-center justify-center gap-2 bg-charcoal text-cream font-medium py-3 rounded-xl hover:bg-rust transition-colors text-sm"
                    >
                      <CreditCard className="w-4 h-4" />
                      Checkout Group ({formatPrice(groupTotal)})
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {showInvite && group && (
        <InviteModal
          group={group}
          participants={participants}
          onClose={() => setShowInvite(false)}
          onInvited={loadData}
        />
      )}

      {showCheckout && group && (
        <CheckoutModal
          group={group}
          orderItems={orderItems}
          groupTotal={groupTotal}
          onClose={() => setShowCheckout(false)}
          onCheckedOut={() => {
            setShowCheckout(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
