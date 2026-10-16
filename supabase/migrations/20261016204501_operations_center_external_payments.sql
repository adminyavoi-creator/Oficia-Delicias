-- Centro de Operaciones: pagos anotados fuera de Oficia, nunca procesados aquí.

-- The membership table is kept private, has no client grants, and is read only
-- by the SECURITY DEFINER authorization helper.
alter table private.operations_users enable row level security;

do $$
declare
  operator_id uuid;
begin
  select u.id into operator_id
  from auth.users u
  join public.oficia_profiles p on p.user_id = u.id
  where lower(u.email) = lower('alonsovl.logos88@gmail.com')
    and u.email_confirmed_at is not null
    and p.account_type = 'anfitrion';

  if operator_id is null then
    raise exception 'La cuenta anfitriona verificada de Operaciones no existe';
  end if;

  insert into private.operations_users (user_id)
  values (operator_id)
  on conflict (user_id) do nothing;
end;
$$;

alter table public.bookings
  add column if not exists operations_reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists operations_reviewed_at timestamptz;

create table if not exists public.booking_financial_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  direction text not null check (direction in ('cobro_cliente', 'pago_anfitrion', 'reembolso_cliente')),
  amount_cents integer not null check (amount_cents > 0),
  method text not null check (method in ('transferencia', 'efectivo', 'otro')),
  external_reference text not null check (char_length(btrim(external_reference)) between 3 and 100),
  event_date date not null default current_date,
  note text not null default '' check (char_length(note) <= 500),
  recorded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists booking_financial_events_booking_created_idx
  on public.booking_financial_events (booking_id, created_at desc);
alter table public.booking_financial_events enable row level security;
revoke all on public.booking_financial_events from public, anon, authenticated;
grant select (id, booking_id, direction, amount_cents, method, external_reference, event_date, note, created_at)
  on public.booking_financial_events to authenticated;
create policy "Operaciones y partes consultan movimientos propios"
  on public.booking_financial_events for select to authenticated
  using (
    (select public.is_oficia_operations())
    or exists (
      select 1 from public.bookings b
      join public.spaces s on s.id = b.space_id
      where b.id = booking_financial_events.booking_id
        and (b.client_id = (select auth.uid()) or s.host_id = (select auth.uid()))
    )
  );

create or replace function public.operations_record_external_payment(
  p_booking_id uuid,
  p_direction text,
  p_amount_cents integer,
  p_method text,
  p_external_reference text,
  p_event_date date default current_date,
  p_note text default ''
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking_row public.bookings%rowtype;
  is_demo_space boolean;
  customer_net_cents integer;
  owner_paid_cents integer;
  event_id uuid;
begin
  if (select auth.uid()) is null or not (select private.is_oficia_operations()) then
    raise exception 'Solo Operaciones puede registrar movimientos externos';
  end if;
  if p_direction not in ('cobro_cliente', 'pago_anfitrion', 'reembolso_cliente')
    or p_amount_cents is null or p_amount_cents <= 0
    or p_method not in ('transferencia', 'efectivo', 'otro')
    or p_external_reference is null
    or char_length(btrim(p_external_reference)) not between 3 and 100
    or char_length(coalesce(p_note, '')) > 500 then
    raise exception 'Revisa los datos del movimiento externo';
  end if;
  if coalesce(p_event_date, current_date) > current_date then
    raise exception 'La fecha del movimiento no puede estar en el futuro';
  end if;

  select b.* into booking_row
  from public.bookings b
  where b.id = p_booking_id
  for update;
  if not found then raise exception 'No se encontró el ticket'; end if;
  select s.is_demo into is_demo_space from public.spaces s where s.id = booking_row.space_id;
  if coalesce(is_demo_space, true) then raise exception 'Los espacios de muestra no admiten movimientos'; end if;

  select coalesce(sum(case when e.direction = 'cobro_cliente' then e.amount_cents
                           when e.direction = 'reembolso_cliente' then -e.amount_cents else 0 end), 0)::integer
    into customer_net_cents
  from public.booking_financial_events e where e.booking_id = p_booking_id;
  select coalesce(sum(e.amount_cents), 0)::integer into owner_paid_cents
  from public.booking_financial_events e
  where e.booking_id = p_booking_id and e.direction = 'pago_anfitrion';

  if p_direction = 'cobro_cliente' then
    if booking_row.status <> 'pendiente'
      or customer_net_cents + p_amount_cents > booking_row.total_cents then
      raise exception 'El cobro excede el saldo pendiente del ticket';
    end if;
  elsif p_direction = 'reembolso_cliente' then
    if booking_row.status not in ('pendiente', 'rechazada', 'cancelada')
      or p_amount_cents > customer_net_cents then
      raise exception 'El reembolso excede el importe recibido';
    end if;
  else
    if booking_row.status <> 'confirmada' or booking_row.completed_at is null then
      raise exception 'El pago al anfitrión requiere una renta finalizada';
    end if;
    if owner_paid_cents + p_amount_cents > coalesce(booking_row.owner_balance_estimate_cents, booking_row.total_cents) then
      raise exception 'El pago excede el saldo estimado del ticket';
    end if;
  end if;

  insert into public.booking_financial_events (
    booking_id, direction, amount_cents, method, external_reference,
    event_date, note, recorded_by
  ) values (
    p_booking_id, p_direction, p_amount_cents, p_method, btrim(p_external_reference),
    coalesce(p_event_date, current_date), btrim(coalesce(p_note, '')), (select auth.uid())
  ) returning id into event_id;
  return event_id;
end;
$$;
revoke all on function public.operations_record_external_payment(uuid, text, integer, text, text, date, text) from public, anon;
grant execute on function public.operations_record_external_payment(uuid, text, integer, text, text, date, text) to authenticated;

create or replace function public.operations_decide_booking(
  p_booking_id uuid,
  p_decision text,
  p_reason text default ''
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking_row public.bookings%rowtype;
  is_demo_space boolean;
  customer_net_cents integer;
begin
  if (select auth.uid()) is null or not (select private.is_oficia_operations()) then
    raise exception 'Solo Operaciones puede revisar tickets';
  end if;
  if p_decision not in ('confirmar', 'rechazar') then
    raise exception 'La decisión no es válida';
  end if;
  select b.* into booking_row from public.bookings b where b.id = p_booking_id for update;
  if not found or booking_row.status <> 'pendiente' then
    raise exception 'El ticket ya fue revisado o no existe';
  end if;
  select s.is_demo into is_demo_space from public.spaces s where s.id = booking_row.space_id;
  if coalesce(is_demo_space, true) then raise exception 'Los espacios de muestra no admiten rentas'; end if;

  select coalesce(sum(case when e.direction = 'cobro_cliente' then e.amount_cents
                           when e.direction = 'reembolso_cliente' then -e.amount_cents else 0 end), 0)::integer
    into customer_net_cents
  from public.booking_financial_events e where e.booking_id = p_booking_id;

  if p_decision = 'confirmar' then
    if customer_net_cents < booking_row.total_cents then
      raise exception 'Registra y valida fuera de Oficia el total del cobro antes de autorizar';
    end if;
    update public.bookings
      set status = 'confirmada', rejection_reason = null,
          operations_reviewed_by = (select auth.uid()), operations_reviewed_at = now()
      where id = p_booking_id;
  else
    if nullif(btrim(coalesce(p_reason, '')), '') is null then
      raise exception 'Indica el motivo del rechazo';
    end if;
    if customer_net_cents <> 0 then
      raise exception 'Registra primero el reembolso externo antes de rechazar';
    end if;
    update public.bookings
      set status = 'rechazada', rejection_reason = btrim(p_reason),
          operations_reviewed_by = (select auth.uid()), operations_reviewed_at = now()
      where id = p_booking_id;
  end if;
end;
$$;
revoke all on function public.operations_decide_booking(uuid, text, text) from public, anon;
grant execute on function public.operations_decide_booking(uuid, text, text) to authenticated;

comment on table public.booking_financial_events is
  'Bitácora inmutable de cobros, pagos y reembolsos realizados por fuera de Oficia. No procesa ni mueve dinero.';
comment on column public.booking_financial_events.external_reference is
  'Referencia externa solamente. No guardar CLABE, número de cuenta, tarjeta ni credenciales.';

-- El anfitrión no puede confirmar una renta sin la validación externa de Operaciones.
-- Conserva la posibilidad de marcar como realizada una renta ya autorizada.
create or replace function public.review_booking()
returns trigger language plpgsql set search_path = '' as $$
declare
  actor_is_host boolean;
  actor_is_operations boolean;
begin
  actor_is_host := exists (
    select 1 from public.spaces s where s.id = old.space_id and s.host_id = (select auth.uid())
  );
  actor_is_operations := (select public.is_oficia_operations());
  if not actor_is_host and not actor_is_operations then
    raise exception 'Solo el anfitrión del espacio u Operaciones puede actualizar la renta';
  end if;

  if row(new.id,new.client_id,new.space_id,new.local_date,new.local_time,new.starts_at,
      new.ends_at,new.unit,new.quantity,new.total_cents,new.created_at,new.transfer_reference,
      new.payer_reference,new.payment_status,new.payment_reported_at,new.payment_reviewed_by,
      new.payment_reviewed_at,new.payment_review_note) is distinct from
     row(old.id,old.client_id,old.space_id,old.local_date,old.local_time,old.starts_at,
      old.ends_at,old.unit,old.quantity,old.total_cents,old.created_at,old.transfer_reference,
      old.payer_reference,old.payment_status,old.payment_reported_at,old.payment_reviewed_by,
      old.payment_reviewed_at,old.payment_review_note) then
    raise exception 'Los datos de la solicitud y sus campos de pago son de solo lectura';
  end if;

  if new.status is distinct from old.status then
    if not actor_is_operations then
      raise exception 'Operaciones valida el movimiento externo antes de autorizar la renta';
    end if;
    if old.status <> 'pendiente' or new.status not in ('confirmada','rechazada')
      or old.completed_at is not null or new.completed_at is not null then
      raise exception 'Esta solicitud ya fue revisada';
    end if;
    if new.status = 'rechazada' then
      if nullif(btrim(new.rejection_reason), '') is null then
        raise exception 'Indica por qué no puedes aceptar la solicitud';
      end if;
      new.rejection_reason := btrim(new.rejection_reason);
    else
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
  elsif new.completed_at is distinct from old.completed_at then
    if old.status <> 'confirmada' or old.completed_at is not null or new.completed_at is null
      or old.ends_at > now() then
      raise exception 'La renta solo se puede finalizar después de la hora de salida';
    end if;
    new.completed_at := now();
  elsif new.rejection_reason is distinct from old.rejection_reason then
    raise exception 'El motivo solo puede guardarse al rechazar la solicitud';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- Restaurar únicamente la actualización que el anfitrión necesita al concluir una renta.
grant update (completed_at) on public.bookings to authenticated;
