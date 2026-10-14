-- Oficia: catálogo y solicitudes. Todos los espacios iniciales son demostrativos.
create table public.spaces (
  id text primary key,
  host_id uuid references auth.users(id) on delete set null,
  name text not null,
  area text not null,
  city text not null default 'Delicias',
  category text not null check (category in ('Oficina privada', 'Sala de juntas', 'Coworking')),
  capacity integer not null check (capacity > 0),
  description text not null,
  privacy text not null,
  amenities text[] not null default '{}',
  image_url text not null,
  gallery_urls text[] not null default '{}',
  rate_hour_cents integer not null check (rate_hour_cents > 0),
  rate_day_cents integer not null check (rate_day_cents > 0),
  rate_week_cents integer not null check (rate_week_cents > 0),
  rating numeric(2,1),
  review_count integer not null default 0,
  is_demo boolean not null default true,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  space_id text not null references public.spaces(id),
  local_date date not null,
  local_time time without time zone not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null default now(),
  unit text not null check (unit in ('Hora', 'Día', 'Semana')),
  quantity integer not null check (
    (unit = 'Hora' and quantity between 1 and 12) or
    (unit = 'Día' and quantity between 1 and 14) or
    (unit = 'Semana' and quantity between 1 and 4)
  ),
  total_cents integer not null default 0,
  status text not null default 'pendiente' check (status in ('pendiente', 'confirmada', 'rechazada', 'cancelada')),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_interval_valid check (ends_at > starts_at)
);

create index spaces_host_idx on public.spaces(host_id);
create index bookings_client_created_idx on public.bookings(client_id, created_at desc);
create index bookings_space_dates_idx on public.bookings(space_id, starts_at, ends_at);

create function public.prepare_booking()
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
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

create trigger prepare_booking_before_insert
before insert on public.bookings
for each row execute function public.prepare_booking();

create function public.review_booking()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.spaces s
    where s.id = new.space_id and s.host_id = (select auth.uid())
  ) then
    raise exception 'No puedes responder esta solicitud';
  end if;
  if old.status <> 'pendiente' or new.status not in ('confirmada', 'rechazada') then
    raise exception 'Esta solicitud ya fue respondida';
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

create trigger review_booking_before_update
before update of status, rejection_reason on public.bookings
for each row execute function public.review_booking();

alter table public.spaces enable row level security;
alter table public.bookings enable row level security;

revoke all on public.spaces from anon, authenticated;
revoke all on public.bookings from anon, authenticated;
grant select on public.spaces to anon, authenticated;
grant select on public.bookings to authenticated;
grant insert (client_id, space_id, local_date, local_time, unit, quantity) on public.bookings to authenticated;
grant update (status, rejection_reason) on public.bookings to authenticated;

create policy "Leer espacios publicados o propios"
on public.spaces for select to anon, authenticated
using (is_published or host_id = (select auth.uid()));

create policy "Leer solicitudes propias o de espacios propios"
on public.bookings for select to authenticated
using (
  client_id = (select auth.uid()) or exists (
    select 1 from public.spaces s
    where s.id = space_id and s.host_id = (select auth.uid())
  )
);

create policy "Crear solicitud propia"
on public.bookings for insert to authenticated
with check (
  client_id = (select auth.uid()) and exists (
    select 1 from public.spaces s
    where s.id = space_id and s.is_published
  )
);

create policy "Responder solicitudes de espacios propios"
on public.bookings for update to authenticated
using (exists (
  select 1 from public.spaces s
  where s.id = space_id and s.host_id = (select auth.uid())
))
with check (exists (
  select 1 from public.spaces s
  where s.id = space_id and s.host_id = (select auth.uid())
));

insert into public.spaces
  (id, name, area, city, category, capacity, description, privacy, amenities,
   image_url, gallery_urls, rate_hour_cents, rate_day_cents, rate_week_cents,
   rating, review_count, is_demo, is_published)
values
  ('sala-norte', 'Sala Norte', 'Centro, Delicias', 'Delicias', 'Sala de juntas', 8,
   'Un espacio privado y luminoso para reunir a tu equipo, presentar ideas y tomar decisiones con todo listo al llegar.',
   'Sala cerrada y de uso exclusivo durante tu reserva.',
   array['Internet rápido','Pantalla','Pizarrón','Videollamadas','Café'],
   'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1100&q=85',
   array['https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1100&q=85','https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1100&q=85','https://images.unsplash.com/photo-1497366858526-0766cadbe8fa?w=1100&q=85'],
   28000, 175000, 775000, 4.9, 38, true, true),
  ('oficina-olivo', 'Oficina Olivo', 'Sector Oriente, Delicias', 'Delicias', 'Oficina privada', 4,
   'Una oficina tranquila para trabajar con concentración, atender llamadas y mantener tu día bajo control.',
   'Oficina independiente con puerta.',
   array['Internet rápido','Monitor','Café','Enchufes','Climatización'],
   'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1100&q=85',
   array['https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1100&q=85','https://images.unsplash.com/photo-1497366858526-0766cadbe8fa?w=1100&q=85'],
   19000, 119000, 535000, 4.8, 27, true, true),
  ('mesa-colectiva', 'Mesa Colectiva', 'Centro, Delicias', 'Delicias', 'Coworking', 1,
   'Un lugar flexible para cambiar de ambiente, avanzar en tus proyectos y coincidir con otras personas.',
   'Área compartida; las llamadas se realizan en zonas designadas.',
   array['Internet rápido','Café','Enchufes','Área común'],
   'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1100&q=85',
   array['https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1100&q=85','https://images.unsplash.com/photo-1497366412874-3415097a27e7?w=1100&q=85'],
   8500, 49000, 219000, 4.9, 46, true, true),
  ('estudio-alamo', 'Estudio Álamo', 'Meoqui, Chihuahua', 'Meoqui', 'Oficina privada', 3,
   'Un estudio cómodo para sesiones de trabajo pequeñas, reuniones privadas o proyectos de varios días.',
   'Espacio cerrado y de uso exclusivo durante tu reserva.',
   array['Internet rápido','Proyector','Pizarrón','Climatización'],
   'https://images.unsplash.com/photo-1497366858526-0766cadbe8fa?w=1100&q=85',
   array['https://images.unsplash.com/photo-1497366858526-0766cadbe8fa?w=1100&q=85','https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1100&q=85'],
   22000, 139000, 620000, 4.7, 19, true, true);
