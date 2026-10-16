-- Evita almacenar por accidente números de cuenta, CLABE o tarjeta en los campos libres.
alter table public.booking_financial_events
  add constraint booking_financial_events_no_bank_identifiers
  check (
    coalesce(external_reference, '') !~* '(^|[^0-9])([0-9][ -]?){13,19}([^0-9]|$)'
    and coalesce(note, '') !~* '(^|[^0-9])([0-9][ -]?){13,19}([^0-9]|$)'
  );

comment on constraint booking_financial_events_no_bank_identifiers on public.booking_financial_events is
  'Bloquea secuencias que parezcan CLABE o tarjeta en referencias/notas. Guardar solo folios externos breves.';
