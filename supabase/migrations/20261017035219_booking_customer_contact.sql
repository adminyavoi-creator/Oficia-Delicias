-- Private customer contact is released to the owner only after Operations
-- authorizes a real booking. Do not use user_metadata for permissions.
create or replace function private.booking_customer_contact(p_booking_id uuid)
returns table(display_name text,email text,phone text,avatar_url text)
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Inicia sesión para continuar'; end if;
  return query
  select coalesce(nullif(u.raw_user_meta_data->>'full_name',''),nullif(u.raw_user_meta_data->>'name',''),nullif(u.raw_user_meta_data->>'display_name',''),'Cliente Oficia'),
    u.email, nullif(u.phone,''), coalesce(nullif(u.raw_user_meta_data->>'avatar_url',''),nullif(u.raw_user_meta_data->>'picture',''))
  from public.bookings b join public.spaces s on s.id=b.space_id join auth.users u on u.id=b.client_id
  where b.id=p_booking_id and b.status='confirmada' and not s.is_demo and s.host_id=(select auth.uid());
  if not found then raise exception 'Los datos estarán disponibles cuando Operaciones autorice la renta'; end if;
end;
$$;
revoke all on function private.booking_customer_contact(uuid) from public,anon;
grant execute on function private.booking_customer_contact(uuid) to authenticated;
create or replace function public.booking_customer_contact(p_booking_id uuid)
returns table(display_name text,email text,phone text,avatar_url text)
language sql security invoker set search_path = '' as $$ select * from private.booking_customer_contact(p_booking_id); $$;
revoke all on function public.booking_customer_contact(uuid) from public,anon;
grant execute on function public.booking_customer_contact(uuid) to authenticated;
