-- Depósitos por transferencia, revisión de Operaciones y coordenadas para mapas.
-- Los importes y las ubicaciones de muestra siguen marcados como demostración.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.operations_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
revoke all on private.operations_users from public, anon, authenticated;

create or replace function public.is_oficia_operations()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.operations_users o
    where o.user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_oficia_operations() from public, anon;
grant execute on function public.is_oficia_operations() to authenticated;

create sequence if not exists public.oficia_transfer_reference_seq;

alter table public.spaces add column if not exists latitude double precision;
alter table public.spaces add column if not exists longitude double precision;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'spaces_coordinates_pair_check') then
    alter table public.spaces add constraint spaces_coordinates_pair_check
      check ((latitude is null) = (longitude is null));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'spaces_coordinates_range_check') then
    alter table public.spaces add constraint spaces_coordinates_range_check
      check (latitude is null or (latitude between -90 and 90 and longitude between -180 and 180));
  end if;
end $$;

alter table public.bookings add column if not exists transfer_reference text;
alter table public.bookings add column if not exists payer_reference text;
alter table public.bookings add column if not exists payment_status text not null default 'pendiente';
alter table public.bookings add column if not exists payment_reported_at timestamptz;
alter table public.bookings add column if not exists payment_reviewed_by uuid references auth.users(id) on delete set null;
alter table public.bookings add column if not exists payment_reviewed_at timestamptz;
alter table public.bookings add column if not exists payment_review_note text;

update public.bookings
set transfer_reference = 'OF-' || lpad(nextval('public.oficia_transfer_reference_seq')::text, 8, '0')
where transfer_reference is null;

alter table public.bookings alter column transfer_reference set not null;
alter table public.bookings alter column transfer_reference
  set default ('OF-' || lpad(nextval('public.oficia_transfer_reference_seq')::text, 8, '0'));

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'bookings_transfer_reference_key') then
    alter table public.bookings add constraint bookings_transfer_reference_key unique (transfer_reference);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'bookings_payment_status_check') then
    alter table public.bookings add constraint bookings_payment_status_check
      check (payment_status in ('pendiente', 'reportado', 'verificado', 'rechazado'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'bookings_payer_reference_length_check') then
    alter table public.bookings add constraint bookings_payer_reference_length_check
      check (payer_reference is null or char_length(btrim(payer_reference)) between 4 and 80);
  end if;
end $$;

create table if not exists public.transfer_settings (
  id smallint primary key default 1 check (id = 1),
  bank_name text,
  clabe text,
  beneficiary text,
  instructions text not null default 'Incluye la referencia Oficia en el concepto de la transferencia.',
  updated_at timestamptz not null default now(),
  constraint transfer_settings_clabe_check check (clabe is null or clabe ~ '^[0-9]{18}$')
);
insert into public.transfer_settings (id) values (1) on conflict (id) do nothing;
alter table public.transfer_settings enable row level security;
revoke all on public.transfer_settings from anon, authenticated;
grant select on public.transfer_settings to anon, authenticated;
grant update on public.transfer_settings to authenticated;
drop policy if exists "Datos bancarios visibles" on public.transfer_settings;
create policy "Datos bancarios visibles" on public.transfer_settings
  for select to anon, authenticated using (true);
drop policy if exists "Operaciones actualiza datos bancarios" on public.transfer_settings;
create policy "Operaciones actualiza datos bancarios" on public.transfer_settings
  for update to authenticated using ((select public.is_oficia_operations()))
  with check ((select public.is_oficia_operations()));

create or replace function public.prepare_booking()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  selected_space public.spaces%rowtype;
begin
  if (select auth.uid()) is null or new.client_id <> (select auth.uid()) then
    raise exception 'Debes iniciar sesión para solicitar un espacio';
  end if;

  select * into selected_space from public.spaces
  where id = new.space_id and is_published;
  if not found then
    raise exception 'El espacio no está disponible para solicitudes';
  end if;

  new.starts_at := (new.local_date + new.local_time) at time zone 'America/Chihuahua';
  if new.unit = 'Hora' then
    new.ends_at := new.starts_at + make_interval(hours => new.quantity);
    new.total_cents := selected_space.rate_hour_cents * new.quantity;
  elsif new.unit = 'Día' then
    new.ends_at := (new.local_date + new.quantity + new.local_time) at time zone 'America/Chihuahua';
    new.total_cents := selected_space.rate_day_cents * new.quantity;
  else
    new.ends_at := (new.local_date + new.quantity * 7 + new.local_time) at time zone 'America/Chihuahua';
    new.total_cents := selected_space.rate_week_cents * new.quantity;
  end if;

  if new.starts_at <= now() or new.starts_at > now() + interval '180 days' then
    raise exception 'Elige una fecha futura dentro de los próximos 180 días';
  end if;

  new.status := 'pendiente';
  new.rejection_reason := null;
  new.payment_status := 'pendiente';
  new.payer_reference := null;
  new.payment_reported_at := null;
  new.payment_reviewed_by := null;
  new.payment_reviewed_at := null;
  new.payment_review_note := null;
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.guard_booking_updates()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select public.is_oficia_operations()) then
    if new.payment_status is distinct from old.payment_status then
      if old.payment_status <> 'reportado' or new.payment_status not in ('verificado', 'rechazado') then
        raise exception 'Solo se puede revisar un depósito reportado';
      end if;
      new.payment_reviewed_by := (select auth.uid());
      new.payment_reviewed_at := now();
    end if;
    new.updated_at := now();
    return new;
  end if;

  if (select auth.uid()) is distinct from old.client_id
    or old.status <> 'pendiente'
    or old.payment_status <> 'pendiente'
    or new.payment_status <> 'reportado'
    or nullif(btrim(new.payer_reference), '') is null
    or char_length(btrim(new.payer_reference)) < 4
    or char_length(btrim(new.payer_reference)) > 80 then
    raise exception 'No se puede reportar este depósito';
  end if;

  if row(new.id, new.client_id, new.space_id, new.local_date, new.local_time, new.starts_at,
      new.ends_at, new.unit, new.quantity, new.total_cents, new.status, new.rejection_reason,
      new.created_at, new.transfer_reference) is distinct from
     row(old.id, old.client_id, old.space_id, old.local_date, old.local_time, old.starts_at,
      old.ends_at, old.unit, old.quantity, old.total_cents, old.status, old.rejection_reason,
      old.created_at, old.transfer_reference)
    or new.payment_reported_at is distinct from old.payment_reported_at
    or new.payment_reviewed_by is distinct from old.payment_reviewed_by
    or new.payment_reviewed_at is distinct from old.payment_reviewed_at
    or new.payment_review_note is distinct from old.payment_review_note then
    raise exception 'Solo puedes reportar la referencia de tu transferencia';
  end if;

  new.payer_reference := btrim(new.payer_reference);
  new.payment_reported_at := now();
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.review_booking()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not (select public.is_oficia_operations()) then
    raise exception 'Solo Operaciones puede autorizar esta renta';
  end if;
  if old.status <> 'pendiente' or new.status not in ('confirmada', 'rechazada') then
    raise exception 'Esta solicitud ya fue revisada';
  end if;
  if new.status = 'confirmada' and new.payment_status <> 'verificado' then
    raise exception 'Verifica el depósito antes de confirmar la renta';
  end if;
  if new.status = 'rechazada' and nullif(btrim(new.rejection_reason), '') is null then
    raise exception 'Indica el motivo del rechazo';
  end if;
  if new.status = 'confirmada' then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.space_id, 0));
    if exists (
      select 1 from public.bookings b
      where b.space_id = new.space_id and b.id <> new.id
        and b.status = 'confirmada'
        and b.starts_at < new.ends_at and b.ends_at > new.starts_at
    ) then
      raise exception 'El espacio ya está confirmado en ese horario';
    end if;
    new.rejection_reason := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists guard_booking_updates_before_update on public.bookings;
create trigger guard_booking_updates_before_update
before update on public.bookings
for each row execute function public.guard_booking_updates();

drop policy if exists "Responder solicitudes de espacios propios" on public.bookings;
drop policy if exists "Cliente reporta transferencia propia" on public.bookings;
create policy "Cliente reporta transferencia propia" on public.bookings
  for update to authenticated
  using (client_id = (select auth.uid()) and status = 'pendiente' and payment_status = 'pendiente')
  with check (client_id = (select auth.uid()) and status = 'pendiente' and payment_status = 'reportado');
drop policy if exists "Operaciones gestiona solicitudes" on public.bookings;
create policy "Operaciones gestiona solicitudes" on public.bookings
  for update to authenticated using ((select public.is_oficia_operations()))
  with check ((select public.is_oficia_operations()));
drop policy if exists "Operaciones ve solicitudes" on public.bookings;
create policy "Operaciones ve solicitudes" on public.bookings
  for select to authenticated using ((select public.is_oficia_operations()));

grant select, insert, update on public.bookings to authenticated;
