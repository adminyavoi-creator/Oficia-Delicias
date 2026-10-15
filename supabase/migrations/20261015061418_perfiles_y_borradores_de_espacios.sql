-- Un solo acceso para dos experiencias. El tipo se elige una vez y no admite cambios.
create table public.oficia_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  account_type text not null check (account_type in ('cliente', 'anfitrion')),
  created_at timestamptz not null default now()
);

-- Las cuentas anteriores conservan su actividad: anfitrión si ya tiene espacios,
-- cliente en los demás casos. No se muestran correos ni otros datos personales.
insert into public.oficia_profiles (user_id, account_type)
select u.id,
  case when exists (select 1 from public.spaces s where s.host_id = u.id)
    then 'anfitrion' else 'cliente' end
from auth.users u;

create function public.prevent_oficia_profile_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'El tipo de perfil de Oficia no se puede modificar';
end;
$$;
create trigger prevent_oficia_profile_update
before update on public.oficia_profiles
for each row execute function public.prevent_oficia_profile_update();

alter table public.oficia_profiles enable row level security;
revoke all on public.oficia_profiles from anon, authenticated;
grant select, insert (user_id, account_type) on public.oficia_profiles to authenticated;
create policy "Leer perfil propio" on public.oficia_profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Elegir perfil propio una vez" on public.oficia_profiles
  for insert to authenticated with check (user_id = (select auth.uid()));

-- Ni la interfaz de cliente ni una llamada directa a la API pueden reservar
-- desde una cuenta que decidió rentar espacios.
create function public.require_oficia_client()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from public.oficia_profiles p
    where p.user_id = (select auth.uid()) and p.account_type = 'cliente'
  ) then
    raise exception 'Esta cuenta está registrada para rentar espacios';
  end if;
  return new;
end;
$$;
create trigger require_oficia_client_before_booking
before insert on public.bookings
for each row execute function public.require_oficia_client();

-- Captura privada de inventario. Un borrador no aparece en el catálogo público.
create table public.space_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '' check (char_length(name) <= 100),
  area text not null default '' check (char_length(area) <= 140),
  city text not null default 'Delicias' check (char_length(city) <= 80),
  category text not null default 'Oficina privada' check (category in ('Oficina privada','Sala de juntas','Coworking')),
  capacity integer not null default 1 check (capacity between 1 and 100),
  description text not null default '' check (char_length(description) <= 2000),
  privacy text not null default '' check (char_length(privacy) <= 500),
  amenities text[] not null default '{}',
  image_url text not null default '' check (char_length(image_url) <= 1000),
  rate_hour_cents integer not null default 0 check (rate_hour_cents between 0 and 100000000),
  rate_day_cents integer not null default 0 check (rate_day_cents between 0 and 100000000),
  rate_week_cents integer not null default 0 check (rate_week_cents between 0 and 100000000),
  status text not null default 'borrador' check (status in ('borrador','en_revision','aprobado','rechazado')),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index space_drafts_owner_created_idx on public.space_drafts (owner_id, created_at desc);
create index space_drafts_review_idx on public.space_drafts (status, created_at desc) where status = 'en_revision';

create function public.guard_space_draft()
returns trigger language plpgsql set search_path = '' as $$
declare is_ops boolean := (select public.is_oficia_operations());
begin
  if tg_op = 'INSERT' then
    if new.owner_id <> (select auth.uid()) or new.status <> 'borrador' then
      raise exception 'Solo puedes crear un borrador propio';
    end if;
    new.created_at := now();
  else
    if new.id <> old.id or new.owner_id <> old.owner_id or new.created_at <> old.created_at then
      raise exception 'No puedes transferir un espacio ni cambiar su identidad';
    end if;
    if not is_ops then
      if old.owner_id <> (select auth.uid()) or old.status not in ('borrador','rechazado')
         or new.status not in ('borrador','en_revision')
         or new.rejection_reason is distinct from old.rejection_reason then
        raise exception 'Este borrador ya no admite cambios';
      end if;
    end if;
  end if;
  if new.status = 'en_revision' and (
    length(btrim(new.name)) < 3 or length(btrim(new.area)) < 3
    or length(btrim(new.description)) < 20 or length(btrim(new.privacy)) < 10
    or new.rate_hour_cents <= 0 or new.rate_day_cents <= 0 or new.rate_week_cents <= 0
    or new.image_url !~* '^https://[^[:space:]]+$'
  ) then
    raise exception 'Completa descripción, privacidad, tarifas y foto antes de enviar a revisión';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger guard_space_draft_before_write
before insert or update on public.space_drafts
for each row execute function public.guard_space_draft();

alter table public.space_drafts enable row level security;
revoke all on public.space_drafts from anon, authenticated;
grant select, insert (owner_id, name, area, city, category, capacity, description, privacy,
  amenities, image_url, rate_hour_cents, rate_day_cents, rate_week_cents), update on public.space_drafts to authenticated;
create policy "Ver borradores propios u Operaciones" on public.space_drafts
  for select to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_oficia_operations()));
create policy "Anfitrion crea borrador propio" on public.space_drafts
  for insert to authenticated
  with check (
    owner_id = (select auth.uid()) and status = 'borrador'
    and exists (select 1 from public.oficia_profiles p
      where p.user_id = (select auth.uid()) and p.account_type = 'anfitrion')
  );
create policy "Anfitrion u Operaciones actualiza borrador" on public.space_drafts
  for update to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_oficia_operations()))
  with check (owner_id = (select auth.uid()) or (select public.is_oficia_operations()));
