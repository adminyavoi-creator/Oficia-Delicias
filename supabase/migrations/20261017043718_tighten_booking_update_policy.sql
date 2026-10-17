-- Retain one least-privilege host UPDATE policy. Operations changes statuses
-- only through the private RPCs, which validate the external ledger first.
drop policy if exists "Anfitrion u Operaciones gestiona rentas" on public.bookings;
drop policy if exists "Anfitrion responde solicitudes propias" on public.bookings;
create policy "Anfitrion responde solicitudes propias" on public.bookings
  for update to authenticated
  using (
    exists (
      select 1 from public.spaces s where s.id = bookings.space_id
        and s.host_id = (select auth.uid()) and not s.is_demo
    ) and (
      (status = 'pendiente' and completed_at is null)
      or (status = 'confirmada' and completed_at is null and ends_at <= now())
    )
  )
  with check (
    exists (
      select 1 from public.spaces s where s.id = bookings.space_id
        and s.host_id = (select auth.uid()) and not s.is_demo
    ) and (
      (status in ('aceptada_anfitrion','rechazada') and completed_at is null)
      or (status = 'confirmada' and completed_at is not null)
    )
  );

create index if not exists booking_messages_sender_id_idx on public.booking_messages(sender_id);
create index if not exists owner_customer_reviews_host_idx on public.owner_customer_reviews(host_id,created_at desc);
