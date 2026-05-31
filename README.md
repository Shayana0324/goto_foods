# 🍔 TableDrop — Group Ordering App

A full-stack Next.js group ordering experience built with Supabase, inspired by DoorDash group orders.

## Features

- **Authentication** — Email/password signup + login via Supabase Auth
- **Create Group Orders** — Host creates an order, gets an invite code
- **Invite Participants** — Invite up to 3 people by email or shareable link (capped at 3 total)
- **Real-time Menu** — Browse 8 menu items across Burgers, Sides, Sandwiches, and Drinks
- **Per-user Carts** — Each participant independently adds/removes items from their cart
- **Live Updates** — Supabase Realtime syncs all participant carts in real-time
- **Host Checkout** — Only the host can review and place the final group order
- **Order Summary** — See a per-person breakdown of items and totals
- **Mobile Responsive** — Slide-up cart panel on mobile, full sidebar on desktop

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 (App Router) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Fonts | Playfair Display + DM Sans |
| Language | TypeScript |

---

## Getting Started

### 1. Clone & Install

```bash
git clone <repo>
cd group-order-app
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In the SQL Editor, run the entire contents of `supabase/schema.sql`
3. This will:
   - Create all tables (`profiles`, `menu_items`, `group_orders`, `group_participants`, `order_items`)
   - Set up Row Level Security policies
   - Seed 8 menu items
   - Enable Realtime on relevant tables
   - Create helper functions

### 3. Configure Environment

```bash
cp .env.local.example .env.local
```

Fill in your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Find these in your Supabase project: **Settings → API**

### 4. Configure Supabase Auth

In Supabase Dashboard → **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: Add `http://localhost:3000/auth/callback`

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Architecture

```
app/
├── page.tsx                    # Landing page
├── dashboard/page.tsx          # User's order history
├── auth/
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   └── callback/route.ts       # OAuth callback
├── order/[groupId]/page.tsx    # Main ordering experience
└── join/[inviteCode]/page.tsx  # Invite link landing

components/
├── group/
│   ├── CreateGroupModal.tsx    # Create new group order
│   ├── InviteModal.tsx         # Invite participants
│   └── CheckoutModal.tsx       # Host checkout flow

lib/
├── supabase/
│   ├── client.ts               # Browser Supabase client
│   └── server.ts               # Server Supabase client
└── utils.ts                    # formatPrice, getInitials, etc.

types/index.ts                  # TypeScript interfaces
supabase/schema.sql             # Full database schema
middleware.ts                   # Auth route protection
```

## Database Schema

```
profiles          ← Auto-created from auth.users
menu_items        ← Static menu (seeded)
group_orders      ← A group order session
group_participants ← Members of a group order
order_items       ← Individual cart items per user per group
```

## User Flows

### Host Flow
1. Sign up / log in
2. Create a group order from the dashboard
3. Invite friends by email or share the invite link
4. Browse menu and add items (same as participants)
5. See everyone's cart update in real-time
6. When ready, click "Checkout Group Order"
7. Review the full order summary and place it

### Participant Flow
1. Receive invite link (e.g., `/join/abc12345`)
2. Sign up or log in if needed
3. Automatically join the group order
4. Browse menu and add items
5. Wait for host to check out
6. See a "waiting for host" status indicator

---

## Menu Items

| Item | Category | Price |
|------|----------|-------|
| 🍔 The Classic Smashburger | Burgers | $12.99 |
| 🍄 The Mushroom Swiss | Burgers | $13.99 |
| 🌶️ Spicy Crispy Chicken Sandwich | Sandwiches | $13.99 |
| 🍟 Truffle Fries | Sides | $7.99 |
| 🧀 Loaded Cheese Fries | Sides | $9.99 |
| 🧅 Onion Rings | Sides | $7.49 |
| 🍓 Strawberry Milkshake | Drinks | $6.99 |
| 🍦 Vanilla Bean Shake | Drinks | $6.49 |

---

## Production Deployment

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Set all `.env.local` values as Vercel environment variables.

Update Supabase Auth URL config to your production domain.

---

## Notes & Design Decisions

- **Invite cap enforced at DB level** — The `join_group_by_invite_code` SQL function checks participant count before inserting, preventing race conditions
- **Row Level Security** — Every table has RLS policies; users can only see/modify data they're authorized to access
- **Realtime via Supabase channels** — The order page subscribes to changes in `order_items`, `group_participants`, and `group_orders` tables
- **No payment processing** — The checkout flow updates the order status to `checked_out` but doesn't call a real payment API (demo only)
- **Auth redirect flow** — Joining via invite link while unauthenticated saves the invite URL as `?redirectTo=`, so after auth the user lands directly on the join page
