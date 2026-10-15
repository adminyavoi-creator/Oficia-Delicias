-- Snapshot the agreed Oficia operations fee on the server for consistent owner reporting.
-- `total_cents` is the rental base: the booking trigger sets it from the space rate and
-- does not include rental taxes. These generated amounts are estimates, not tax receipts
-- or settlement evidence. Host rental taxes and withholdings are intentionally not modeled.
alter table public.bookings
  add column if not exists operations_fee_cents integer
    generated always as (round(total_cents::numeric * 0.15)::integer) stored,
  add column if not exists operations_fee_vat_estimate_cents integer
    generated always as (round(round(total_cents::numeric * 0.15) * 0.16)::integer) stored,
  add column if not exists owner_balance_estimate_cents integer
    generated always as (
      total_cents
      - round(total_cents::numeric * 0.15)::integer
      - round(round(total_cents::numeric * 0.15) * 0.16)::integer
    ) stored;

comment on column public.bookings.total_cents is
  'Renta base en centavos MXN, fijada desde la tarifa del espacio, sin impuestos de renta.';
comment on column public.bookings.operations_fee_cents is
  'Estimación operativa 15% de renta base. No constituye CFDI ni liquidación.';
comment on column public.bookings.operations_fee_vat_estimate_cents is
  'Estimación 16% sobre la comisión de Oficia; su tratamiento fiscal requiere validación profesional.';
comment on column public.bookings.owner_balance_estimate_cents is
  'Saldo estimado tras comisión e IVA estimado de comisión; no descuenta impuestos/retenciones del anfitrión ni confirma pago.';
