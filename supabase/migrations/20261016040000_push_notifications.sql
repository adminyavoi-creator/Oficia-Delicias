-- Push notifications for Oficia. Delivery is handled only by the Edge Function.
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  booking_updates boolean not null default true,
  reminders boolean not null default true,
  space_updates boolean not null default true,
  reviews boolean not null default true,
  promotions boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('android', 'ios', 'web')),
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists push_devices_user_active_idx on public.push_devices(user_id, is_active);
create unique index if not exists push_devices_user_token_key on public.push_devices(user_id, token);

create table if not exists public.notification_inbox (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('booking_updates','reminders','space_updates','reviews','promotions')),
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notification_inbox_user_created_idx on public.notification_inbox(user_id, created_at desc);

create table if not exists public.notification_campaigns (
  id uuid primary key default gen_random_uuid(),
  target_role text not null check (target_role in ('cliente','anfitrion','todos')),
  title text not null check (char_length(btrim(title)) between 1 and 80),
  body text not null check (char_length(btrim(body)) between 1 and 220),
  scheduled_at timestamptz not null default now(),
  status text not null default 'programada' check (status in ('programada','procesando','enviada','cancelada')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
alter table public.notification_preferences enable row level security;
alter table public.push_devices enable row level security;
alter table public.notification_inbox enable row level security;
alter table public.notification_campaigns enable row level security;

revoke all on public.notification_preferences, public.push_devices, public.notification_inbox, public.notification_campaigns from anon, authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
grant select, insert, update on public.push_devices to authenticated;
grant select on public.notification_inbox to authenticated;
grant update (read_at) on public.notification_inbox to authenticated;
grant select, insert, update on public.notification_campaigns to authenticated;

create policy "Preferencias propias" on public.notification_preferences for select to authenticated using (user_id = (select auth.uid()));
create policy "Crear preferencias propias" on public.notification_preferences for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Actualizar preferencias propias" on public.notification_preferences for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Dispositivos propios" on public.push_devices for select to authenticated using (user_id = (select auth.uid()));
create policy "Registrar dispositivo propio" on public.push_devices for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Actualizar dispositivo propio" on public.push_devices for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Bandeja propia" on public.notification_inbox for select to authenticated using (user_id = (select auth.uid()));
create policy "Marcar aviso propio" on public.notification_inbox for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Operaciones consulta campañas" on public.notification_campaigns for select to authenticated using ((select public.is_oficia_operations()));
create policy "Operaciones crea campañas" on public.notification_campaigns for insert to authenticated with check ((select public.is_oficia_operations()) and created_by = (select auth.uid()));
create policy "Operaciones administra campañas" on public.notification_campaigns for update to authenticated using ((select public.is_oficia_operations())) with check ((select public.is_oficia_operations()));

create table if not exists public.push_outbox (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('booking_updates','reminders','space_updates','reviews','promotions')),
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now()
);
create index if not exists push_outbox_pending_idx on public.push_outbox(scheduled_at) where sent_at is null;
alter table public.push_outbox enable row level security;
revoke all on public.push_outbox from anon, authenticated;

create or replace function public.enqueue_oficia_push(
  p_key text, p_user uuid, p_category text, p_title text, p_body text, p_data jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = '' as $$
declare
  allowed boolean;
begin
  if p_user is null then return; end if;
  select case p_category
    when 'booking_updates' then booking_updates
    when 'reminders' then reminders
    when 'space_updates' then space_updates
    when 'reviews' then reviews
    when 'promotions' then promotions
    else false end
  into allowed from public.notification_preferences where user_id = p_user;
  if not coalesce(allowed, p_category <> 'promotions') then return; end if;
  insert into public.notification_inbox(dedupe_key, user_id, category, title, body, data)
  values (p_key, p_user, p_category, p_title, p_body, coalesce(p_data, '{}'::jsonb))
  on conflict (dedupe_key) do nothing;
  insert into public.push_outbox(dedupe_key, user_id, category, title, body, data)
  values (p_key, p_user, p_category, p_title, p_body, coalesce(p_data, '{}'::jsonb))
  on conflict (dedupe_key) do nothing;
end; $$;
revoke all on function public.enqueue_oficia_push(text, uuid, text, text, text, jsonb) from public, anon, authenticated;

create or replace function public.notify_booking_oficia() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  space_name text;
  host_user uuid;
begin
  select name, host_id into space_name, host_user from public.spaces where id = new.space_id and not is_demo;
  if not found then return new; end if;
  if tg_op = 'INSERT' then
    perform public.enqueue_oficia_push('booking:' || new.id || ':submitted:' || new.client_id, new.client_id, 'booking_updates', 'Solicitud enviada', 'Tu solicitud para ' || space_name || ' quedó registrada.', jsonb_build_object('screen','reservations','bookingId',new.id));
    perform public.enqueue_oficia_push('booking:' || new.id || ':new-host:' || host_user, host_user, 'booking_updates', 'Nueva solicitud', 'Tienes una solicitud para ' || space_name || '.', jsonb_build_object('screen','owner','bookingId',new.id));
  elsif old.status is distinct from new.status then
    if new.status = 'confirmada' then
      perform public.enqueue_oficia_push('booking:' || new.id || ':confirmed:' || new.client_id, new.client_id, 'booking_updates', 'Espacio confirmado', space_name || ' confirmó tu solicitud.', jsonb_build_object('screen','reservations','bookingId',new.id));
    elsif new.status = 'rechazada' then
      perform public.enqueue_oficia_push('booking:' || new.id || ':rejected:' || new.client_id, new.client_id, 'booking_updates', 'Actualización de solicitud', 'Revisa el estado de tu solicitud para ' || space_name || '.', jsonb_build_object('screen','reservations','bookingId',new.id));
    end if;
  elsif old.completed_at is null and new.completed_at is not null then
    perform public.enqueue_oficia_push('booking:' || new.id || ':review:' || new.client_id, new.client_id, 'reviews', '¿Cómo estuvo tu espacio?', 'Deja una opinión sobre ' || space_name || '.', jsonb_build_object('screen','reviews','spaceId',new.space_id));
    perform public.enqueue_oficia_push('booking:' || new.id || ':completed-host:' || host_user, host_user, 'booking_updates', 'Renta finalizada', 'La renta de ' || space_name || ' quedó marcada como realizada.', jsonb_build_object('screen','owner','bookingId',new.id));
  end if;
  return new;
end; $$;
drop trigger if exists notify_booking_oficia_trigger on public.bookings;
create trigger notify_booking_oficia_trigger after insert or update of status, completed_at on public.bookings for each row execute function public.notify_booking_oficia();

create or replace function public.notify_space_draft_oficia() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status and new.status in ('aprobado','rechazado') then
    perform public.enqueue_oficia_push('space-draft:' || new.id || ':' || new.status, new.owner_id, 'space_updates',
      case when new.status = 'aprobado' then 'Tu espacio está publicado' else 'Tu ficha necesita ajustes' end,
      case when new.status = 'aprobado' then new.name || ' ya aparece en Oficia.' else coalesce(nullif(new.rejection_reason,''),'Revisa la ficha y vuelve a enviarla.') end,
      jsonb_build_object('screen','owner','draftId',new.id));
  end if;
  return new;
end; $$;
drop trigger if exists notify_space_draft_oficia_trigger on public.space_drafts;
create trigger notify_space_draft_oficia_trigger after update of status on public.space_drafts for each row execute function public.notify_space_draft_oficia();

create or replace function public.notify_review_oficia() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  host_user uuid;
  space_name text;
begin
  select host_id, name into host_user, space_name from public.spaces where id = new.space_id and not is_demo;
  perform public.enqueue_oficia_push('review:' || new.id || ':owner:' || host_user, host_user, 'reviews',
    'Nueva opinión', 'Un cliente compartió una opinión sobre ' || coalesce(space_name,'tu espacio') || '.',
    jsonb_build_object('screen','owner','spaceId',new.space_id));
  return new;
end; $$;
drop trigger if exists notify_review_oficia_trigger on public.space_reviews;
create trigger notify_review_oficia_trigger after insert on public.space_reviews for each row execute function public.notify_review_oficia();

-- Booking reminders and campaigns are enqueued by the scheduled Edge Function worker.
