-- Schedule social posts processing every 5 minutes
DO $$
BEGIN
  PERFORM cron.unschedule('process-social-posts');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not unschedule process-social-posts: %', SQLERRM;
END;
$$;

SELECT cron.schedule(
  'process-social-posts',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://xkhvojjogoeuvrifekwr.supabase.co/functions/v1/process-social-posts',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    )::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);
