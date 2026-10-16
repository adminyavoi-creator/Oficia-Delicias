-- Values are provisioned directly into Supabase Vault, never committed to this file.
create extension if not exists pg_net;
create extension if not exists pg_cron;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'oficia_push_function_url')
     or not exists (select 1 from vault.secrets where name = 'oficia_push_publishable_key') then
    raise exception 'Oficia push scheduler values must be provisioned in Vault before this migration runs.';
  end if;
end
$$;

select cron.schedule(
  'oficia-push-worker-every-minute',
  '* * * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'oficia_push_function_url') || '/functions/v1/oficia-push-worker',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'oficia_push_publishable_key')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 10000
    );
  $job$
);
