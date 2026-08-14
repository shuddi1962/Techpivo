-- 060_award_xp_reference.sql
-- Upgrade award_xp to persist reference_id/reference_type so XP dedupe works.
-- Backwards compatible: existing 4-arg callers keep working via defaults.

-- Ensure user_profiles has notification_preferences (notifications route writes
-- to it; no prior migration defined the column — without it the PUT is a no-op).
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Ensure user_xp_log has reference_type (award_xp below inserts into it; the
-- live table only has amount/reason/reference_id from 057).
ALTER TABLE public.user_xp_log
  ADD COLUMN IF NOT EXISTS reference_type text;

CREATE OR REPLACE FUNCTION public.award_xp(
  target_user_id uuid,
  xp_amount int,
  action_name text,
  desc_text text DEFAULT NULL,
  ref_id uuid DEFAULT NULL,
  ref_type text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, xp, level)
  VALUES (target_user_id, xp_amount, 1)
  ON CONFLICT (id) DO UPDATE SET xp = COALESCE(user_profiles.xp, 0) + EXCLUDED.xp;

  INSERT INTO public.user_xp_log (user_id, amount, reason, reference_id, reference_type)
  VALUES (target_user_id, xp_amount, COALESCE(desc_text, action_name), ref_id, ref_type);
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_xp(uuid, int, text, text, uuid, text) TO authenticated, anon, service_role;

-- Hard guarantee: one XP award per quiz per user, even under concurrent attempts.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'user_xp_log'
      AND indexname = 'user_xp_log_quiz_once'
  ) THEN
    CREATE UNIQUE INDEX user_xp_log_quiz_once
      ON public.user_xp_log (user_id, reference_id)
      WHERE reason = 'complete_quiz' AND reference_id IS NOT NULL;
  END IF;
END $$;
