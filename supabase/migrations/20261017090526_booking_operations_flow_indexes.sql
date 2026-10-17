create index if not exists booking_payment_proofs_uploaded_by_idx
  on public.booking_payment_proofs(uploaded_by);
create index if not exists bookings_agreement_closed_by_idx
  on public.bookings(agreement_closed_by)
  where agreement_closed_by is not null;
