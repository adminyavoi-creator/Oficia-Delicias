-- Owner review is a preliminary step. Only Operations can issue the final
-- authorization after recording the external collection in the ledger.
alter table public.bookings
  add column if not exists host_reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists host_reviewed_at timestamptz;

alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status in ('pendiente','aceptada_anfitrion','confirmada','rechazada','cancelada'));

create index if not exists bookings_host_review_idx on public.bookings(host_reviewed_by, host_reviewed_at desc);

drop policy if exists "Anfitrion responde solicitudes propias" on public.bookings;
create policy "Anfitrion responde solicitudes propias" on public.bookings
  for update to authenticated
  using (
    status = 'pendiente' and exists (
      select 1 from public.spaces s where s.id = bookings.space_id
        and s.host_id = (select auth.uid()) and not s.is_demo
    )
  )
  with check (
    status in ('aceptada_anfitrion','rechazada') and exists (
      select 1 from public.spaces s where s.id = bookings.space_id
        and s.host_id = (select auth.uid()) and not s.is_demo
    )
  );

grant update (status, rejection_reason) on public.bookings to authenticated;

create or replace function public.review_booking()
returns trigger language plpgsql set search_path = '' as $$
declare
  actor_is_host boolean;
  actor_is_operations boolean;
begin
  actor_is_host := exists (
    select 1 from public.spaces s where s.id = old.space_id
      and s.host_id = (select auth.uid()) and not s.is_demo
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
    if actor_is_host and not actor_is_operations then
      if old.status <> 'pendiente' or new.status not in ('aceptada_anfitrion','rechazada')
        or old.completed_at is not null or new.completed_at is not null then
        raise exception 'Esta solicitud ya fue revisada';
      end if;
      new.host_reviewed_by := (select auth.uid());
      new.host_reviewed_at := now();
      if new.status = 'aceptada_anfitrion' then
        new.rejection_reason := null;
      else
        new.rejection_reason := coalesce(nullif(btrim(new.rejection_reason), ''), 'El anfitrión no puede aceptar esta solicitud.');
      end if;
    elsif actor_is_operations then
      if old.status <> 'aceptada_anfitrion' or new.status not in ('confirmada','rechazada')
        or old.completed_at is not null or new.completed_at is not null then
        raise exception 'Primero el anfitrión debe aceptar la solicitud; después Operaciones podrá autorizarla';
      end if;
      new.operations_reviewed_by := (select auth.uid());
      new.operations_reviewed_at := now();
      if new.status = 'rechazada' then
        if nullif(btrim(new.rejection_reason), '') is null then
          raise exception 'Indica por qué se devuelve la solicitud';
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
    else
      raise exception 'No tienes permiso para cambiar el estado de esta solicitud';
    end if;
  elsif new.completed_at is distinct from old.completed_at then
    if old.status <> 'confirmada' or old.completed_at is not null or new.completed_at is null
      or old.ends_at > now() then
      raise exception 'La renta solo se puede finalizar después de la hora de salida';
    end if;
    new.completed_at := now();
  elsif new.rejection_reason is distinct from old.rejection_reason then
    raise exception 'El motivo solo puede guardarse al revisar la solicitud';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

