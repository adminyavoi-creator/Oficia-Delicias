-- Horario y cierres por fecha local de Delicias. Una estancia por día/semana
-- empieza durante el horario de llegada y ocupa el intervalo completo.
alter table public.spaces
  add column open_days integer[] not null default '{1,2,3,4,5}',
  add column opens_at time not null default '08:00',
  add column closes_at time not null default '18:00',
  add constraint spaces_open_days_valid check (
    cardinality(open_days) between 1 and 7 and open_days <@ array[0,1,2,3,4,5,6]
  ),
  add constraint spaces_open_hours_valid check (closes_at > opens_at);

create table public.space_closures (
  space_id text not null references public.spaces(id) on delete cascade,
  closed_on date not null,
  created_at timestamptz not null default now(),
  primary key (space_id, closed_on)
);
alter table public.space_closures enable row level security;
revoke all on public.space_closures from anon, authenticated;
grant select (space_id, closed_on) on public.space_closures to anon, authenticated;
grant insert (space_id, closed_on), delete on public.space_closures to authenticated;

create policy "Ver cierres de espacios publicados o propios"
on public.space_closures for select to anon, authenticated
using (exists (select 1 from public.spaces s where s.id = space_id
  and (s.is_published or s.host_id = (select auth.uid()))));
create policy "Anfitrion u Operaciones bloquea fechas"
on public.space_closures for insert to authenticated
with check (exists (select 1 from public.spaces s where s.id = space_id
  and (s.host_id = (select auth.uid()) or (select public.is_oficia_operations()))));
create policy "Anfitrion u Operaciones libera fechas"
on public.space_closures for delete to authenticated
using (exists (select 1 from public.spaces s where s.id = space_id
  and (s.host_id = (select auth.uid()) or (select public.is_oficia_operations()))));

create function public.guard_space_closure()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.closed_on < (now() at time zone 'America/Chihuahua')::date then
    raise exception 'Solo puedes bloquear fechas actuales o futuras';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.space_id, 0));
  if exists (
    select 1 from public.bookings b where b.space_id = new.space_id
      and b.status = 'confirmada'
      and b.starts_at < ((new.closed_on + 1)::timestamp at time zone 'America/Chihuahua')
      and b.ends_at > (new.closed_on::timestamp at time zone 'America/Chihuahua')
  ) then
    raise exception 'Ya existe una renta autorizada ese día';
  end if;
  return new;
end;
$$;
create trigger guard_space_closure_before_insert
before insert on public.space_closures
for each row execute function public.guard_space_closure();

create or replace function public.assert_booking_availability(
  p_space_id text, p_local_date date, p_local_time time,
  p_starts_at timestamptz, p_ends_at timestamptz, p_unit text
) returns void language plpgsql set search_path = '' as $$
declare selected_space public.spaces%rowtype;
begin
  select * into selected_space from public.spaces where id = p_space_id;
  if not found or not selected_space.is_published then
    raise exception 'El espacio no está disponible';
  end if;
  -- Los ejemplos siguen siendo navegables, pero nunca se usan para renta real.
  if selected_space.is_demo then return; end if;
  if not (extract(dow from p_local_date)::integer = any(selected_space.open_days))
    or p_local_time < selected_space.opens_at or p_local_time >= selected_space.closes_at then
    raise exception 'El espacio está cerrado en el horario elegido';
  end if;
  if p_unit = 'Hora' and
    (p_ends_at at time zone 'America/Chihuahua')::date = p_local_date and
    (p_ends_at at time zone 'America/Chihuahua')::time > selected_space.closes_at then
    raise exception 'La estancia termina después del cierre';
  end if;
  if p_unit = 'Hora' and (p_ends_at at time zone 'America/Chihuahua')::date <> p_local_date then
    raise exception 'La estancia por horas debe terminar el mismo día';
  end if;
  if exists (
    select 1 from public.space_closures c where c.space_id = p_space_id
      and c.closed_on >= p_local_date
      and c.closed_on < (p_ends_at at time zone 'America/Chihuahua')::date
        + case when (p_ends_at at time zone 'America/Chihuahua')::time > time '00:00' then 1 else 0 end
  ) then
    raise exception 'El espacio tiene un cierre durante esa estancia';
  end if;
end;
$$;
revoke all on function public.assert_booking_availability(text,date,time,timestamptz,timestamptz,text) from public;
grant execute on function public.assert_booking_availability(text,date,time,timestamptz,timestamptz,text) to authenticated;

create or replace function public.prepare_booking()
returns trigger language plpgsql set search_path = '' as $$
declare selected_space public.spaces%rowtype;
begin
  if (select auth.uid()) is null or new.client_id <> (select auth.uid()) then
    raise exception 'Debes iniciar sesión para solicitar un espacio';
  end if;
  select * into selected_space from public.spaces where id = new.space_id and is_published;
  if not found then raise exception 'El espacio no está disponible para solicitudes'; end if;
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
  perform public.assert_booking_availability(new.space_id,new.local_date,new.local_time,new.starts_at,new.ends_at,new.unit);
  new.status := 'pendiente'; new.rejection_reason := null;
  new.payment_status := 'pendiente'; new.payer_reference := null;
  new.payment_reported_at := null; new.payment_reviewed_by := null;
  new.payment_reviewed_at := null; new.payment_review_note := null;
  new.created_at := now(); new.updated_at := now();
  return new;
end;
$$;

create or replace function public.review_booking()
returns trigger language plpgsql set search_path = '' as $$
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
    if exists (select 1 from public.spaces s where s.id = new.space_id and s.is_demo) then
      raise exception 'Un espacio de muestra no admite rentas autorizadas';
    end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.space_id, 0));
    perform public.assert_booking_availability(new.space_id,new.local_date,new.local_time,new.starts_at,new.ends_at,new.unit);
    if exists (select 1 from public.bookings b where b.space_id = new.space_id
      and b.id <> new.id and b.status = 'confirmada'
      and b.starts_at < new.ends_at and b.ends_at > new.starts_at) then
      raise exception 'El espacio ya está confirmado en ese horario';
    end if;
    new.rejection_reason := null;
  end if;
  new.updated_at := now(); return new;
end;
$$;

create or replace function public.guard_booking_updates()
returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.spaces s where s.id = old.space_id and s.is_demo)
    and new.payment_status is distinct from old.payment_status then
    raise exception 'Los espacios de muestra no admiten depósitos';
  end if;
  if (select public.is_oficia_operations()) then
    if row(new.id,new.client_id,new.space_id,new.local_date,new.local_time,new.starts_at,
      new.ends_at,new.unit,new.quantity,new.total_cents,new.created_at,new.transfer_reference,
      new.payer_reference,new.payment_reported_at) is distinct from
      row(old.id,old.client_id,old.space_id,old.local_date,old.local_time,old.starts_at,
      old.ends_at,old.unit,old.quantity,old.total_cents,old.created_at,old.transfer_reference,
      old.payer_reference,old.payment_reported_at) then
      raise exception 'Operaciones no puede cambiar los datos originales de la solicitud';
    end if;
    if new.payment_status is distinct from old.payment_status then
      if old.payment_status <> 'reportado' or new.payment_status not in ('verificado','rechazado') then
        raise exception 'Solo se puede revisar un depósito reportado';
      end if;
      new.payment_reviewed_by := (select auth.uid()); new.payment_reviewed_at := now();
    elsif row(new.payment_reviewed_by,new.payment_reviewed_at) is distinct from
      row(old.payment_reviewed_by,old.payment_reviewed_at) then
      raise exception 'El registro de revisión se asigna automáticamente';
    end if;
    new.updated_at := now(); return new;
  end if;
  if (select auth.uid()) is distinct from old.client_id or old.status <> 'pendiente'
    or old.payment_status <> 'pendiente' or new.payment_status <> 'reportado'
    or nullif(btrim(new.payer_reference),'') is null
    or char_length(btrim(new.payer_reference)) < 4
    or char_length(btrim(new.payer_reference)) > 80 then
    raise exception 'No se puede reportar este depósito';
  end if;
  if row(new.id,new.client_id,new.space_id,new.local_date,new.local_time,new.starts_at,
    new.ends_at,new.unit,new.quantity,new.total_cents,new.status,new.rejection_reason,
    new.created_at,new.transfer_reference) is distinct from
    row(old.id,old.client_id,old.space_id,old.local_date,old.local_time,old.starts_at,
    old.ends_at,old.unit,old.quantity,old.total_cents,old.status,old.rejection_reason,
    old.created_at,old.transfer_reference)
    or new.payment_reported_at is distinct from old.payment_reported_at
    or new.payment_reviewed_by is distinct from old.payment_reviewed_by
    or new.payment_reviewed_at is distinct from old.payment_reviewed_at
    or new.payment_review_note is distinct from old.payment_review_note then
    raise exception 'Solo puedes reportar la referencia de tu transferencia';
  end if;
  new.payer_reference := btrim(new.payer_reference);
  new.payment_reported_at := now(); new.updated_at := now();
  return new;
end;
$$;
