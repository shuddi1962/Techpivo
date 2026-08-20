-- 081_gmail_only_signup.sql
-- DB-level guard: only Gmail (gmail.com / googlemail.com) or TechPivo staff
-- (techpivo.com) emails may register. Runs BEFORE INSERT on auth.users so the
-- restriction holds even for direct Supabase signUp() calls that bypass the
-- Next.js route. Login for existing non-Gmail users is NOT affected.
--
-- NOTE: this trigger also blocks users created via the Supabase dashboard
-- (admin-created users get no email) — NULL emails are allowed through since
-- the dashboard flow has no email to check; signup itself always has one.

CREATE OR REPLACE FUNCTION public.enforce_gmail_only_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_domain text;
BEGIN
  IF NEW.email IS NULL OR NEW.email = '' THEN
    RETURN NEW;
  END IF;

  v_domain := lower(split_part(NEW.email, '@', 2));

  IF v_domain NOT IN ('gmail.com', 'googlemail.com', 'techpivo.com') THEN
    RAISE EXCEPTION 'Signup is limited to Gmail accounts only.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gmail_only_signup ON auth.users;

CREATE TRIGGER trg_gmail_only_signup
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.enforce_gmail_only_signup();

REVOKE ALL ON FUNCTION public.enforce_gmail_only_signup() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_gmail_only_signup() TO postgres, service_role, supabase_auth_admin;