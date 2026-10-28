-- =============================================================================
-- CHICKCHAU SUPABASE RLS & GRANTS SECURITY VERIFICATION SUITE
-- File: supabase/tests/rls_security_test.sql
-- =============================================================================

BEGIN;

-- 1. Verify Row Level Security (relrowsecurity and relforcerowsecurity) is active
DO $$
DECLARE
  tbl TEXT;
  rls_enabled BOOLEAN;
  rls_forced BOOLEAN;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['users', 'products', 'orders', 'order_items']
  LOOP
    SELECT relrowsecurity, relforcerowsecurity
      INTO rls_enabled, rls_forced
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = tbl;

    IF NOT COALESCE(rls_enabled, FALSE) THEN
      RAISE EXCEPTION 'SECURITY FAILURE: RLS is not enabled on public.%', tbl;
    END IF;

    IF NOT COALESCE(rls_forced, FALSE) THEN
      RAISE EXCEPTION 'SECURITY FAILURE: FORCE RLS is not enabled on public.%', tbl;
    END IF;
  END LOOP;
END
$$;

-- 2. Verify that PUBLIC has zero write/read privileges on orders and order_items
DO $$
BEGIN
  IF has_table_privilege('public', 'public.orders', 'SELECT')
     OR has_table_privilege('public', 'public.orders', 'INSERT')
     OR has_table_privilege('public', 'public.orders', 'UPDATE')
     OR has_table_privilege('public', 'public.orders', 'DELETE') THEN
    RAISE EXCEPTION 'SECURITY FAILURE: PUBLIC role still holds privileges on public.orders';
  END IF;

  IF has_table_privilege('public', 'public.order_items', 'SELECT')
     OR has_table_privilege('public', 'public.order_items', 'INSERT')
     OR has_table_privilege('public', 'public.order_items', 'UPDATE')
     OR has_table_privilege('public', 'public.order_items', 'DELETE') THEN
    RAISE EXCEPTION 'SECURITY FAILURE: PUBLIC role still holds privileges on public.order_items';
  END IF;
END
$$;

-- 3. Verify Supabase anon / authenticated roles (when present) cannot mutate products or access orders
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    IF has_table_privilege('anon', 'public.orders', 'SELECT')
       OR has_table_privilege('anon', 'public.orders', 'INSERT')
       OR has_table_privilege('anon', 'public.orders', 'UPDATE') THEN
      RAISE EXCEPTION 'SECURITY FAILURE: anon role has access to public.orders';
    END IF;

    IF has_table_privilege('anon', 'public.products', 'UPDATE')
       OR has_table_privilege('anon', 'public.products', 'INSERT')
       OR has_table_privilege('anon', 'public.products', 'DELETE') THEN
      RAISE EXCEPTION 'SECURITY FAILURE: anon role can mutate public.products';
    END IF;
  END IF;
END
$$;

ROLLBACK;
