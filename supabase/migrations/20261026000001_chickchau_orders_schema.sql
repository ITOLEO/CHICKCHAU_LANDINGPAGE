-- =============================================================================
-- CHICKCHAU PRODUCTION POSTGRESQL MIGRATION (Supabase & PostgreSQL 15+)
-- Migration: 20261026000001_chickchau_orders_schema.sql
-- =============================================================================

BEGIN;

-- 1. Updated-at timestamp trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 2. Users table (Admin & authenticated user registry)
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE CHECK (char_length(uid) BETWEEN 1 AND 128),
  email TEXT NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254),
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Authoritative Product Catalog table (Integer IDR values)
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY CHECK (id ~ '^[a-z0-9_-]{2,40}$'),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  short_name TEXT NOT NULL CHECK (char_length(short_name) BETWEEN 2 AND 60),
  category TEXT NOT NULL CHECK (char_length(category) BETWEEN 2 AND 60),
  unit_price INTEGER NOT NULL CHECK (unit_price > 0 AND unit_price <= 10000000),
  currency TEXT NOT NULL DEFAULT 'IDR' CHECK (currency = 'IDR'),
  available BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 4. Orders table (Persistent customer orders with server-calculated integer IDR totals)
CREATE TABLE IF NOT EXISTS public.orders (
  id SERIAL PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE CHECK (order_id ~ '^ORD-[0-9]{8}-[A-Z0-9]{6}$'),
  idempotency_key TEXT NOT NULL UNIQUE CHECK (idempotency_key ~ '^[a-zA-Z0-9_-]{8,128}$'),
  payload_fingerprint TEXT NOT NULL CHECK (char_length(payload_fingerprint) BETWEEN 16 AND 128),
  customer_name TEXT NOT NULL CHECK (char_length(btrim(customer_name)) BETWEEN 2 AND 100),
  customer_phone TEXT NOT NULL CHECK (char_length(btrim(customer_phone)) BETWEEN 9 AND 20),
  delivery_address TEXT NOT NULL CHECK (char_length(btrim(delivery_address)) BETWEEN 8 AND 500),
  google_maps_url TEXT NOT NULL CHECK (
    char_length(google_maps_url) <= 1024
    AND google_maps_url ~ '^https://(www\.google\.com/maps|maps\.google\.com|maps\.app\.goo\.gl|goo\.gl/maps)'
  ),
  notes TEXT NOT NULL DEFAULT '' CHECK (char_length(notes) <= 500),
  total_quantity INTEGER NOT NULL CHECK (total_quantity > 0 AND total_quantity <= 200),
  order_subtotal INTEGER NOT NULL CHECK (order_subtotal > 0 AND order_subtotal <= 100000000),
  currency TEXT NOT NULL DEFAULT 'IDR' CHECK (currency = 'IDR'),
  delivery_fee_status TEXT NOT NULL DEFAULT 'unconfirmed_whatsapp' CHECK (
    delivery_fee_status IN ('unconfirmed_whatsapp', 'confirmed')
  ),
  delivery_fee INTEGER CHECK (delivery_fee IS NULL OR (delivery_fee >= 0 AND delivery_fee <= 5000000)),
  provisional_total INTEGER NOT NULL CHECK (provisional_total >= order_subtotal),
  status TEXT NOT NULL DEFAULT 'pending_whatsapp' CHECK (
    status IN (
      'pending_whatsapp',
      'awaiting_admin_confirmation',
      'confirmed',
      'preparing',
      'completed',
      'cancelled'
    )
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);

-- 5. Order Items table (Immutable line-item snapshots per order)
CREATE TABLE IF NOT EXISTS public.order_items (
  id SERIAL PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name_snapshot TEXT NOT NULL CHECK (char_length(product_name_snapshot) BETWEEN 2 AND 120),
  unit_price INTEGER NOT NULL CHECK (unit_price > 0 AND unit_price <= 10000000),
  quantity INTEGER NOT NULL CHECK (quantity >= 1 AND quantity <= 50),
  line_subtotal INTEGER NOT NULL CHECK (line_subtotal = unit_price * quantity),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);

-- 6. Seed authoritative CHICKCHAU product catalog defaults
INSERT INTO public.products (id, name, short_name, category, unit_price, currency, available)
VALUES
  ('capcin', 'Chikchau Capcin', 'Chikchau Capcin', 'Minuman', 8000, 'IDR', TRUE),
  ('shihlin', 'Crispy Chickchau', 'Crispy Chickchau', 'Makanan', 30000, 'IDR', TRUE)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  short_name = EXCLUDED.short_name,
  category = EXCLUDED.category,
  unit_price = EXCLUDED.unit_price,
  currency = EXCLUDED.currency,
  available = EXCLUDED.available;

-- =============================================================================
-- 7. ROW LEVEL SECURITY (RLS) & EXPLICIT PRIVILEGE GRANTS
-- =============================================================================
-- Enable and force RLS on all application tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products FORCE ROW LEVEL SECURITY;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders FORCE ROW LEVEL SECURITY;

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items FORCE ROW LEVEL SECURITY;

-- Explicitly revoke default privileges from PUBLIC and Supabase client roles
REVOKE ALL ON TABLE public.users FROM PUBLIC;
REVOKE ALL ON TABLE public.products FROM PUBLIC;
REVOKE ALL ON TABLE public.orders FROM PUBLIC;
REVOKE ALL ON TABLE public.order_items FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.users, public.products, public.orders, public.order_items FROM anon;
    REVOKE ALL ON SEQUENCE public.users_id_seq, public.orders_id_seq, public.order_items_id_seq FROM anon;
    -- Allow public read-only access to the product catalog only
    GRANT SELECT ON TABLE public.products TO anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.users, public.products, public.orders, public.order_items FROM authenticated;
    REVOKE ALL ON SEQUENCE public.users_id_seq, public.orders_id_seq, public.order_items_id_seq FROM authenticated;
    -- Allow authenticated clients read-only access to the product catalog only
    GRANT SELECT ON TABLE public.products TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE public.users, public.products, public.orders, public.order_items TO service_role;
    GRANT USAGE, SELECT ON SEQUENCE public.users_id_seq, public.orders_id_seq, public.order_items_id_seq TO service_role;
  END IF;
END
$$;

-- Drop any pre-existing policies to keep migration idempotent
DROP POLICY IF EXISTS "public_read_available_products" ON public.products;
DROP POLICY IF EXISTS "deny_all_public_orders" ON public.orders;
DROP POLICY IF EXISTS "deny_all_public_order_items" ON public.order_items;
DROP POLICY IF EXISTS "deny_all_public_users" ON public.users;

-- Policy 1: Public/authenticated clients may only SELECT available products
CREATE POLICY "public_read_available_products"
  ON public.products
  FOR SELECT
  USING (available = TRUE);

-- Policy 2: Deny all direct client access to orders, order_items, and users
-- (All order creation, lookup, and admin operations execute via server-side API functions)
CREATE POLICY "deny_all_public_orders"
  ON public.orders
  FOR ALL
  USING (FALSE)
  WITH CHECK (FALSE);

CREATE POLICY "deny_all_public_order_items"
  ON public.order_items
  FOR ALL
  USING (FALSE)
  WITH CHECK (FALSE);

CREATE POLICY "deny_all_public_users"
  ON public.users
  FOR ALL
  USING (FALSE)
  WITH CHECK (FALSE);

COMMIT;
