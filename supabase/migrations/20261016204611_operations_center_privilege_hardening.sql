-- Refuerza el límite entre operaciones, anfitriones y el API público.

-- La bitácora permanece privada para escritura; RLS también limita lecturas
-- accidentales si en el futuro alguien agrega una concesión de tabla.
create policy "Cada operador solo consulta su membresía"
  on private.operations_users for select to authenticated
  using (user_id = (select auth.uid()));

-- Los anfitriones pueden finalizar una renta autorizada, pero no decidir su estado.
revoke update (status, rejection_reason) on public.bookings from public, anon, authenticated;
grant update (completed_at) on public.bookings to authenticated;

-- Índices para las dos nuevas referencias de auditoría.
create index if not exists booking_financial_events_recorded_by_idx
  on public.booking_financial_events (recorded_by);
create index if not exists bookings_operations_reviewed_by_idx
  on public.bookings (operations_reviewed_by);

-- Mantiene los RPC usados por la app en public como funciones SECURITY INVOKER.
-- La implementación SECURITY DEFINER vive en el esquema privado no expuesto por PostgREST.
alter function public.operations_record_external_payment(uuid, text, integer, text, text, date, text) set schema private;
alter function public.operations_decide_booking(uuid, text, text) set schema private;
grant usage on schema private to authenticated;
revoke all on function private.operations_record_external_payment(uuid, text, integer, text, text, date, text) from public, anon;
revoke all on function private.operations_decide_booking(uuid, text, text) from public, anon;
grant execute on function private.operations_record_external_payment(uuid, text, integer, text, text, date, text) to authenticated;
grant execute on function private.operations_decide_booking(uuid, text, text) to authenticated;

create function public.operations_record_external_payment(
  p_booking_id uuid,
  p_direction text,
  p_amount_cents integer,
  p_method text,
  p_external_reference text,
  p_event_date date default current_date,
  p_note text default ''
) returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.operations_record_external_payment(
    p_booking_id, p_direction, p_amount_cents, p_method, p_external_reference, p_event_date, p_note
  );
$$;
revoke all on function public.operations_record_external_payment(uuid, text, integer, text, text, date, text) from public, anon;
grant execute on function public.operations_record_external_payment(uuid, text, integer, text, text, date, text) to authenticated;

create function public.operations_decide_booking(
  p_booking_id uuid,
  p_decision text,
  p_reason text default ''
) returns void
language sql
security invoker
set search_path = ''
as $$
  select private.operations_decide_booking(p_booking_id, p_decision, p_reason);
$$;
revoke all on function public.operations_decide_booking(uuid, text, text) from public, anon;
grant execute on function public.operations_decide_booking(uuid, text, text) to authenticated;

comment on function public.operations_record_external_payment(uuid, text, integer, text, text, date, text) is
  'Registra una operación que ya se realizó fuera de Oficia; la implementación privada valida el permiso y los límites del ticket.';
comment on function public.operations_decide_booking(uuid, text, text) is
  'Autoriza o rechaza solicitudes desde Operaciones después de la validación manual externa.';
