'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GroupOrder, OrderItem } from '@/types';
import { formatPrice, getInitials, getAvatarColor } from '@/lib/utils';
import { X, CreditCard, Check, ShoppingBag, Receipt, AlertTriangle } from 'lucide-react';

interface Props {
  group: GroupOrder;
  orderItems: OrderItem[];
  groupTotal: number;
  onClose: () => void;
  onCheckedOut: () => void;
}

export default function CheckoutModal({ group, orderItems, groupTotal, onClose, onCheckedOut }: Props) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'review' | 'success'>('review');

  const handleCheckout = async () => {
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('group_orders')
      .update({ status: 'checked_out', checked_out_at: new Date().toISOString() })
      .eq('id', group.id);

    if (!error) {
      setStep('success');
    }
    setLoading(false);
  };

  // Group items by user
  const itemsByUser = orderItems.reduce<Record<string, { profile: OrderItem['profile']; items: OrderItem[] }>>((acc, item) => {
    const uid = item.user_id;
    if (!acc[uid]) acc[uid] = { profile: item.profile, items: [] };
    acc[uid].items.push(item);
    return acc;
  }, {});

  if (step === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm" />
        <div className="relative bg-cream rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center animate-scale-in">
          <div className="w-16 h-16 bg-sage/15 rounded-full flex items-center justify-center mx-auto mb-5">
            <Check className="w-8 h-8 text-sage" />
          </div>
          <h2 className="font-display text-2xl font-bold text-charcoal mb-3">Order placed! 🎉</h2>
          <p className="text-stone text-sm leading-relaxed mb-2">
            Your group order has been checked out successfully.
          </p>
          <p className="text-charcoal font-semibold text-lg mb-6">{formatPrice(groupTotal)}</p>
          <button
            onClick={onCheckedOut}
            className="w-full bg-rust text-cream font-medium py-3 rounded-xl hover:bg-rust-dark transition-colors"
          >
            Back to order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-cream rounded-2xl shadow-2xl w-full max-w-md animate-slide-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone/15">
          <h2 className="font-display text-xl font-bold text-charcoal flex items-center gap-2">
            <Receipt className="w-5 h-5 text-rust" />
            Review & Checkout
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-stone hover:text-charcoal hover:bg-stone/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order review */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {Object.entries(itemsByUser).map(([uid, { profile, items }]) => {
            const userTotal = items.reduce((s, i) => s + (i.menu_item?.price_cents || 0) * i.quantity, 0);
            return (
              <div key={uid}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold ${getAvatarColor(uid)}`}>
                    {getInitials(profile?.display_name, profile?.email || '')}
                  </div>
                  <span className="text-sm font-semibold text-charcoal">
                    {profile?.display_name || profile?.email}
                  </span>
                  <span className="ml-auto text-sm font-medium text-charcoal">{formatPrice(userTotal)}</span>
                </div>
                <div className="space-y-1.5 pl-9">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2">
                      <span className="text-sm text-charcoal">
                        {item.menu_item?.image_emoji} {item.quantity}× {item.menu_item?.name}
                      </span>
                      <span className="text-xs text-stone flex-shrink-0">
                        {formatPrice((item.menu_item?.price_cents || 0) * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-stone/15 space-y-4">
          <div className="bg-cream-dark rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-stone">Subtotal</span>
              <span className="text-sm text-charcoal">{formatPrice(groupTotal)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-stone">Estimated tax (8%)</span>
              <span className="text-sm text-charcoal">{formatPrice(Math.round(groupTotal * 0.08))}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-stone">Delivery fee</span>
              <span className="text-sm text-charcoal">{formatPrice(299)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-stone/20">
              <span className="font-semibold text-charcoal">Total</span>
              <span className="font-bold text-charcoal text-lg">{formatPrice(groupTotal + Math.round(groupTotal * 0.08) + 299)}</span>
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-stone">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gold" />
            <span>This is a demo — no real payment will be processed.</span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading || orderItems.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-rust text-cream font-medium py-3.5 rounded-xl hover:bg-rust-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                Place Group Order
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
