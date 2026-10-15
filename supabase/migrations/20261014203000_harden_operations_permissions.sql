-- Reduce la superficie expuesta de la comprobación del rol y consolida RLS.
create or replace function private.is_oficia_operations()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.operations_users o
    where o.user_id = (select auth.uid())
  );
$$;
revoke all on function private.is_oficia_operations() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_oficia_operations() to authenticated;

create or replace function public.is_oficia_operations()
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.is_oficia_operations();
$$;
revoke all on function public.is_oficia_operations() from public, anon;
grant execute on function public.is_oficia_operations() to authenticated;

drop policy if exists "Leer solicitudes propias o de espacios propios" on public.bookings;
drop policy if exists "Operaciones ve solicitudes" on public.bookings;
create policy "Leer solicitudes propias o de espacios propios" on public.bookings
  for select to authenticated
  using (
    (select public.is_oficia_operations())
    or client_id = (select auth.uid())
    or exists (
      select 1 from public.spaces s
      where s.id = bookings.space_id and s.host_id = (select auth.uid())
    )
  );

drop policy if exists "Cliente reporta transferencia propia" on public.bookings;
drop policy if exists "Operaciones gestiona solicitudes" on public.bookings;
create policy "Cliente u Operaciones actualiza solicitudes" on public.bookings
  for update to authenticated
  using (
    (select public.is_oficia_operations())
    or (client_id = (select auth.uid()) and status = 'pendiente' and payment_status = 'pendiente')
  )
  with check (
    (select public.is_oficia_operations())
    or (client_id = (select auth.uid()) and status = 'pendiente' and payment_status = 'reportado')
  );

create index if not exists bookings_payment_reviewed_by_idx
  on public.bookings (payment_reviewed_by);
