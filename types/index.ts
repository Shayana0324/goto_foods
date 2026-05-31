export type OrderStatus = 'open' | 'locked' | 'checked_out';
export type ParticipantStatus = 'invited' | 'joined' | 'declined';

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  category: string;
  image_emoji: string | null;
  available: boolean;
  created_at: string;
}

export interface GroupOrder {
  id: string;
  invite_code: string;
  host_id: string;
  name: string;
  status: OrderStatus;
  max_participants: number;
  created_at: string;
  updated_at: string;
  checked_out_at: string | null;
}

export interface GroupParticipant {
  id: string;
  group_id: string;
  user_id: string;
  invited_email: string | null;
  status: ParticipantStatus;
  joined_at: string | null;
  created_at: string;
  // Joined
  profile?: Profile;
}

export interface OrderItem {
  id: string;
  group_id: string;
  user_id: string;
  menu_item_id: string;
  quantity: number;
  special_instructions: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  menu_item?: MenuItem;
  profile?: Profile;
}

export interface GroupOrderWithDetails extends GroupOrder {
  host?: Profile;
  participants?: GroupParticipant[];
  order_items?: OrderItem[];
}

export interface CartItem {
  menu_item: MenuItem;
  quantity: number;
  special_instructions?: string;
}
