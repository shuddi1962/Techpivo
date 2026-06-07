-- Add RLS policies for ad_campaigns table

ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

-- Admins can CRUD ad campaigns
CREATE POLICY "Admins can CRUD ad campaigns"
ON public.ad_campaigns
FOR ALL
TO public
USING (
  auth.uid() IN (
    SELECT profiles.id FROM profiles WHERE profiles.role = 'admin'::user_role
  )
);

-- Public can view active campaigns (for frontend display)
CREATE POLICY "Public can view active ad campaigns"
ON public.ad_campaigns
FOR SELECT
TO public
USING (is_active = true);
