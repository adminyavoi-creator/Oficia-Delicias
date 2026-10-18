begin;

-- A space owner should learn about a rental only after Operations authorizes it.
-- Customers still see their own requests; Operations retains its review access.
drop policy if exists "Leer solicitudes propias o de espacios propios" on public.bookings;
create policy "Leer solicitudes propias o de espacios autorizados"
  on public.bookings for select to authenticated
  using (
    (select public.is_oficia_operations())
    or client_id = (select auth.uid())
    or exists (
      select 1 from public.spaces s
      where s.id = bookings.space_id
        and s.host_id = (select auth.uid())
        and bookings.status = 'confirmada'
    )
  );

-- Keep external transfer references and notes private from the owner until the
-- same authorization boundary. Customers and Operations retain their access.
drop policy if exists "Operaciones y partes consultan movimientos propios" on public.booking_financial_events;
create policy "Operaciones y partes consultan movimientos autorizados"
  on public.booking_financial_events for select to authenticated
  using (
    (select public.is_oficia_operations())
    or exists (
      select 1
      from public.bookings b
      join public.spaces s on s.id = b.space_id
      where b.id = booking_financial_events.booking_id
        and (
          b.client_id = (select auth.uid())
          or (s.host_id = (select auth.uid()) and b.status = 'confirmada')
        )
    )
  );

comment on policy "Leer solicitudes propias o de espacios autorizados" on public.bookings is
  'El cliente consulta sus solicitudes; el dueño solo ve rentas autorizadas por Operaciones.';
comment on policy "Operaciones y partes consultan movimientos autorizados" on public.booking_financial_events is
  'Operaciones consulta la bitácora; cliente y dueño solo sus movimientos, con visibilidad del dueño tras autorizar la renta.';

commit;