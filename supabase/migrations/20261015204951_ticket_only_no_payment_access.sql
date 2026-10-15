-- Oficia is ticket-only until a separate, reviewed payment project is approved.
-- Preserve historical booking records while closing the client Data API payment paths.
-- A published ticket remains readable by its client, host and Operations under existing RLS.
revoke update on public.bookings from anon, authenticated;
revoke select, update on public.transfer_settings from anon, authenticated;

comment on table public.transfer_settings is
  'Legacy configuration retained for history only. The ticket-only app does not expose bank details or accept transfer reports.';
comment on column public.bookings.payment_status is
  'Legacy payment status. The ticket-only flow leaves new requests pending and does not report, verify, charge or reconcile money.';
