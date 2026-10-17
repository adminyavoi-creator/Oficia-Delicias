-- Preserve the operations-only external ledger while requiring owner approval
-- before collection and Operations' final authorization after full collection.
create or replace function private.operations_record_external_payment(
  p_booking_id uuid, p_direction text, p_amount_cents integer, p_method text,
  p_external_reference text, p_event_date date default current_date, p_note text default ''
) returns uuid language plpgsql security definer set search_path = '' as $$
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
    or p_external_reference is null or char_length(btrim(p_external_reference)) not between 3 and 100
    or char_length(coalesce(p_note, '')) > 500 then
    raise exception 'Revisa los datos del movimiento externo';
  end if;
  if coalesce(p_event_date, current_date) > current_date then
    raise exception 'La fecha del movimiento no puede estar en el futuro';
  end if;
  select b.* into booking_row from public.bookings b where b.id = p_booking_id for update;
  if not found then raise exception 'No se encontró la solicitud'; end if;
  select s.is_demo into is_demo_space from public.spaces s where s.id = booking_row.space_id;
  if coalesce(is_demo_space, true) then raise exception 'Los espacios de muestra no admiten movimientos'; end if;
  select coalesce(sum(case when e.direction = 'cobro_cliente' then e.amount_cents
    when e.direction = 'reembolso_cliente' then -e.amount_cents else 0 end), 0)::integer
    into customer_net_cents from public.booking_financial_events e where e.booking_id = p_booking_id;
  select coalesce(sum(e.amount_cents), 0)::integer into owner_paid_cents
    from public.booking_financial_events e where e.booking_id = p_booking_id and e.direction = 'pago_anfitrion';
  if p_direction = 'cobro_cliente' then
    if booking_row.status <> 'aceptada_anfitrion' or customer_net_cents + p_amount_cents > booking_row.total_cents then
      raise exception 'El anfitrión debe aceptar primero y el cobro no puede exceder el saldo de la solicitud';
    end if;
  elsif p_direction = 'reembolso_cliente' then
    if booking_row.status not in ('aceptada_anfitrion', 'rechazada', 'cancelada') or p_amount_cents > customer_net_cents then
      raise exception 'El reembolso excede el importe recibido';
    end if;
  else
    if booking_row.status <> 'confirmada' or booking_row.completed_at is null then
      raise exception 'El pago al anfitrión requiere una renta autorizada y finalizada';
    end if;
    if owner_paid_cents + p_amount_cents > coalesce(booking_row.owner_balance_estimate_cents, booking_row.total_cents) then
      raise exception 'El pago excede el saldo estimado del ticket';
    end if;
  end if;
  insert into public.booking_financial_events(booking_id,direction,amount_cents,method,external_reference,event_date,note,recorded_by)
  values (p_booking_id,p_direction,p_amount_cents,p_method,btrim(p_external_reference),coalesce(p_event_date,current_date),btrim(coalesce(p_note,'')),(select auth.uid()))
  returning id into event_id;
  return event_id;
end;
$$;

create or replace function private.operations_decide_booking(p_booking_id uuid,p_decision text,p_reason text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare booking_row public.bookings%rowtype; is_demo_space boolean; customer_net_cents integer;
begin
  if (select auth.uid()) is null or not (select private.is_oficia_operations()) then raise exception 'Solo Operaciones puede revisar solicitudes'; end if;
  if p_decision not in ('confirmar','rechazar') then raise exception 'La decisión no es válida'; end if;
  select b.* into booking_row from public.bookings b where b.id=p_booking_id for update;
  if not found or booking_row.status <> 'aceptada_anfitrion' then raise exception 'El anfitrión aún no ha aceptado la solicitud'; end if;
  select s.is_demo into is_demo_space from public.spaces s where s.id=booking_row.space_id;
  if coalesce(is_demo_space,true) then raise exception 'Los espacios de muestra no admiten rentas'; end if;
  select coalesce(sum(case when e.direction='cobro_cliente' then e.amount_cents when e.direction='reembolso_cliente' then -e.amount_cents else 0 end),0)::integer
    into customer_net_cents from public.booking_financial_events e where e.booking_id=p_booking_id;
  if p_decision='confirmar' then
    if customer_net_cents < booking_row.total_cents then raise exception 'Registra el cobro externo completo antes de autorizar'; end if;
    update public.bookings set status='confirmada',rejection_reason=null,operations_reviewed_by=(select auth.uid()),operations_reviewed_at=now() where id=p_booking_id;
  else
    if nullif(btrim(coalesce(p_reason,'')),'') is null then raise exception 'Indica el motivo del rechazo'; end if;
    if customer_net_cents <> 0 then raise exception 'Registra primero el reembolso externo antes de rechazar'; end if;
    update public.bookings set status='rechazada',rejection_reason=btrim(p_reason),operations_reviewed_by=(select auth.uid()),operations_reviewed_at=now() where id=p_booking_id;
  end if;
end;
$$;

