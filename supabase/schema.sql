-- ============================================
-- GROUP ORDER APP - SUPABASE SCHEMA
-- Run this in your Supabase SQL editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 1: CREATE ALL TABLES (no policies yet)
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  category TEXT NOT NULL,
  image_emoji TEXT,
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.group_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invite_code TEXT UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
  host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Group Order',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'locked', 'checked_out')),
  max_participants INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  checked_out_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.group_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID REFERENCES public.group_orders(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  invited_email TEXT,
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'joined', 'declined')),
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID REFERENCES public.group_orders(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  menu_item_id UUID REFERENCES public.menu_items(id) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  special_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 2: ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: POLICIES (all tables exist now)
-- ============================================

-- profiles
CREATE POLICY "Users can view any profile"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- menu_items
CREATE POLICY "Anyone can view menu items"
  ON public.menu_items FOR SELECT USING (true);

-- group_orders (group_participants exists now)
CREATE POLICY "Participants can view group orders they belong to"
  ON public.group_orders FOR SELECT
  USING (
    host_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.group_participants
      WHERE group_id = group_orders.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create group orders"
  ON public.group_orders FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Only host can update group order"
  ON public.group_orders FOR UPDATE
  USING (host_id = auth.uid());

-- group_participants
CREATE POLICY "Participants can view group participants"
  ON public.group_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.group_orders
      WHERE id = group_participants.group_id
      AND (
        host_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.group_participants gp2
          WHERE gp2.group_id = group_participants.group_id
            AND gp2.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Host can insert participants"
  ON public.group_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_orders
      WHERE id = group_id AND host_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own participation"
  ON public.group_participants FOR UPDATE
  USING (user_id = auth.uid());

-- order_items
CREATE POLICY "Participants can view all items in their group order"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_orders go
      LEFT JOIN public.group_participants gp ON gp.group_id = go.id
      WHERE go.id = order_items.group_id
        AND (go.host_id = auth.uid() OR gp.user_id = auth.uid())
    )
  );

CREATE POLICY "Participants can add their own items"
  ON public.order_items FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.group_orders go
      LEFT JOIN public.group_participants gp ON gp.group_id = go.id
      WHERE go.id = group_id
        AND go.status = 'open'
        AND (go.host_id = auth.uid() OR gp.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update own items in open orders"
  ON public.order_items FOR UPDATE
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.group_orders
      WHERE id = group_id AND status = 'open'
    )
  );

CREATE POLICY "Users can delete own items in open orders"
  ON public.order_items FOR DELETE
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.group_orders
      WHERE id = group_id AND status = 'open'
    )
  );

-- ============================================
-- STEP 4: AUTO-CREATE PROFILE ON SIGNUP
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 5: SEED MENU ITEMS
-- ============================================

INSERT INTO public.menu_items (name, description, price_cents, category, image_emoji) VALUES
  ('The Classic Smashburger', 'Double smash patty, American cheese, pickles, special sauce, brioche bun', 1299, 'Burgers', '🍔'),
  ('Truffle Fries', 'Crispy shoestring fries tossed in truffle oil, parmesan, fresh herbs', 799, 'Sides', '🍟'),
  ('Spicy Crispy Chicken Sandwich', 'Nashville-style hot chicken, slaw, pickles, honey drizzle, brioche', 1399, 'Sandwiches', '🌶️'),
  ('Loaded Cheese Fries', 'Fries smothered in cheddar sauce, bacon bits, jalapeños, sour cream', 999, 'Sides', '🧀'),
  ('The Mushroom Swiss', 'Beef patty, sautéed mushrooms, Swiss cheese, garlic aioli, pretzel bun', 1399, 'Burgers', '🍄'),
  ('Strawberry Milkshake', 'Hand-spun real strawberry milkshake, fresh whipped cream', 699, 'Drinks', '🍓'),
  ('Vanilla Bean Shake', 'Rich vanilla bean milkshake, house-made whipped cream, sprinkles', 649, 'Drinks', '🍦'),
  ('Onion Rings', 'Beer-battered thick-cut onion rings, comeback sauce', 749, 'Sides', '🧅')
ON CONFLICT DO NOTHING;

-- ============================================
-- STEP 6: REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.group_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;

-- ============================================
-- STEP 7: HELPER FUNCTION — join by invite code
-- ============================================

CREATE OR REPLACE FUNCTION public.join_group_by_invite_code(p_invite_code TEXT)
RETURNS JSON AS $$
DECLARE
  v_group       public.group_orders;
  v_part_count  INTEGER;
  v_user_id     UUID := auth.uid();
BEGIN
  -- Find the group
  SELECT * INTO v_group
  FROM public.group_orders
  WHERE invite_code = p_invite_code AND status = 'open';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Group not found or already closed');
  END IF;

  -- Host rejoining — just return success
  IF v_group.host_id = v_user_id THEN
    RETURN json_build_object('success', true, 'group_id', v_group.id, 'role', 'host');
  END IF;

  -- Already a participant — update to joined
  IF EXISTS (
    SELECT 1 FROM public.group_participants
    WHERE group_id = v_group.id AND user_id = v_user_id
  ) THEN
    UPDATE public.group_participants
    SET status = 'joined', joined_at = NOW()
    WHERE group_id = v_group.id AND user_id = v_user_id;

    RETURN json_build_object('success', true, 'group_id', v_group.id, 'role', 'participant');
  END IF;

  -- Count non-host participants (host occupies 1 of the max_participants slots)
  SELECT COUNT(*) INTO v_part_count
  FROM public.group_participants
  WHERE group_id = v_group.id AND status != 'declined';

  -- max_participants includes the host, so guests allowed = max_participants - 1
  IF v_part_count >= (v_group.max_participants - 1) THEN
    RETURN json_build_object('success', false, 'error', 'Group is full');
  END IF;

  -- Insert new participant
  INSERT INTO public.group_participants (group_id, user_id, status, joined_at)
  VALUES (v_group.id, v_user_id, 'joined', NOW());

  RETURN json_build_object('success', true, 'group_id', v_group.id, 'role', 'participant');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;




-- ============================================
-- FIX: Break recursive RLS on group_participants
-- ============================================

-- Step 1: Drop the recursive policy
DROP POLICY IF EXISTS "Participants can view group participants" ON public.group_participants;

-- Step 2: Create a security definer function that checks membership
-- without triggering RLS on group_participants itself
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_participants
    WHERE group_id = p_group_id AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.group_orders
    WHERE id = p_group_id AND host_id = auth.uid()
  );
$$;

-- Step 3: Recreate the policy using the function
CREATE POLICY "Participants can view group participants"
  ON public.group_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_group_member(group_participants.group_id)
  );



  

  DROP POLICY IF EXISTS "Participants can add their own items" ON public.order_items;
DROP POLICY IF EXISTS "Participants can view all items in their group order" ON public.order_items;

CREATE POLICY "Participants can view all items in their group order"
  ON public.order_items FOR SELECT
  USING (
    public.is_group_member(order_items.group_id)
  );

CREATE POLICY "Participants can add their own items"
  ON public.order_items FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_group_member(order_items.group_id)
    AND EXISTS (
      SELECT 1 FROM public.group_orders
      WHERE id = order_items.group_id AND status = 'open'
    )
  );




  -- 1. Allow inserting participants with just an email (no user_id yet)
ALTER TABLE public.group_participants
  ALTER COLUMN user_id DROP NOT NULL;

-- 2. Update the unique constraint to handle nulls
ALTER TABLE public.group_participants DROP CONSTRAINT group_participants_group_id_user_id_key;
CREATE UNIQUE INDEX group_participants_group_user_unique 
  ON public.group_participants (group_id, user_id) WHERE user_id IS NOT NULL;

-- 3. Allow host to invite by email even with no user_id
DROP POLICY IF EXISTS "Host can insert participants" ON public.group_participants;
CREATE POLICY "Host can insert participants"
  ON public.group_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_orders
      WHERE id = group_id AND host_id = auth.uid()
    )
  );

-- 4. Auto-link invite when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );

  -- Link any pending invites for this email
  UPDATE public.group_participants
  SET user_id = NEW.id, status = 'joined', joined_at = NOW()
  WHERE invited_email = NEW.email AND user_id IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;