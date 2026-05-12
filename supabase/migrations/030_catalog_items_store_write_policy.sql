-- 030: catalog_items store write policy
--
-- The live store/inventory table uses catalog_items with sell_currency and
-- sell_price. Staff writes should be allowed for reception/manager/admin.
-- API routes should still use the service role, but this keeps direct staff
-- writes from failing with the generic RLS error.

ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS catalog_items_staff_write ON public.catalog_items;
CREATE POLICY catalog_items_staff_write ON public.catalog_items
FOR ALL TO authenticated
USING (public.current_user_role() IN ('manager','admin','reception'))
WITH CHECK (public.current_user_role() IN ('manager','admin','reception'));

DROP POLICY IF EXISTS catalog_items_select_active ON public.catalog_items;
CREATE POLICY catalog_items_select_active ON public.catalog_items
FOR SELECT TO authenticated
USING (
  is_active
  OR public.current_user_role() IN ('manager','admin','head_coach','coach','reception')
);
