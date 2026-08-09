-- 2026-08-09: Newsletter campaigns — store email body content for real Resend sending.
-- Admin send-campaign now actually delivers emails via Resend (newsletter.techpivo.com verified).

ALTER TABLE public.newsletter_sends
  ADD COLUMN IF NOT EXISTS html_content TEXT;
