-- Allow one installation token to be registered by the currently signed-in
-- account after sign-out/account switching. Each account can still only store
-- one row for a given installation, and RLS keeps every row account-scoped.
alter table public.push_devices drop constraint if exists push_devices_token_key;
create unique index if not exists push_devices_user_token_key
  on public.push_devices(user_id, token);
