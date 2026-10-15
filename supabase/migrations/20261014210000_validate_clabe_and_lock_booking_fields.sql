-- Valida dígito verificador CLABE y limita las columnas que puede revisar Operaciones.
create or replace function private.is_valid_oficia_clabe(candidate text)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  position integer;
  weight integer;
  sum_digits integer := 0;
  expected_digit integer;
begin
  if candidate !~ '^[0-9]{18}$' then return false; end if;
  for position in 1..17 loop
    weight := case pg_catalog.mod(position - 1, 3) when 0 then 3 when 1 then 7 else 1 end;
    sum_digits := sum_digits + pg_catalog.mod(pg_catalog.substr(candidate, position, 1)::integer * weight, 10);
  end loop;
  expected_digit := pg_catalog.mod(10 - pg_catalog.mod(sum_digits, 10), 10);
  return pg_catalog.right(candidate, 1)::integer = expected_digit;
end;
$$;
grant execute on function private.is_valid_oficia_clabe(text) to authenticated;

alter table public.transfer_settings drop constraint if exists transfer_settings_clabe_check;
alter table public.transfer_settings add constraint transfer_settings_clabe_check
  check (clabe is null or private.is_valid_oficia_clabe(clabe));

create or replace function public.guard_booking_updates()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select public.is_oficia_operations()) then
    if row(new.id, new.client_id, new.space_id, new.local_date, new.local_time, new.starts_at,
        new.ends_at, new.unit, new.quantity, new.total_cents, new.created_at, new.transfer_reference,
        new.payer_reference, new.payment_reported_at) is distinct from
       row(old.id, old.client_id, old.space_id, old.local_date, old.local_time, old.starts_at,
        old.ends_at, old.unit, old.quantity, old.total_cents, old.created_at, old.transfer_reference,
        old.payer_reference, old.payment_reported_at) then
      raise exception 'Operaciones no puede cambiar los datos originales de la solicitud';
    end if;
    if new.payment_status is distinct from old.payment_status then
      if old.payment_status <> 'reportado' or new.payment_status not in ('verificado', 'rechazado') then
        raise exception 'Solo se puede revisar un depósito reportado';
      end if;
      new.payment_reviewed_by := (select auth.uid());
      new.payment_reviewed_at := now();
    elsif row(new.payment_reviewed_by, new.payment_reviewed_at) is distinct from
          row(old.payment_reviewed_by, old.payment_reviewed_at) then
      raise exception 'El registro de revisión se asigna automáticamente';
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
