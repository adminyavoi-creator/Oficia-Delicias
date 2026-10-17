create table if not exists public.owner_customer_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  host_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1000),
  created_at timestamptz not null default now()
);
create index if not exists owner_customer_reviews_customer_idx on public.owner_customer_reviews(customer_id,created_at desc);
alter table public.owner_customer_reviews enable row level security;
revoke all on public.owner_customer_reviews from public,anon,authenticated;
grant select on public.owner_customer_reviews to authenticated;
create policy "Cliente, anfitrión u Operaciones leen calificación de renta" on public.owner_customer_reviews for select to authenticated
  using (customer_id=(select auth.uid()) or host_id=(select auth.uid()) or (select public.is_oficia_operations()));
create or replace function private.submit_host_customer_review(p_booking_id uuid,p_rating integer,p_comment text default '')
returns uuid language plpgsql security definer set search_path = '' as $$
declare review_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Inicia sesión para continuar'; end if;
  if p_rating not between 1 and 5 or char_length(coalesce(p_comment,'')) > 1000 then raise exception 'Revisa la calificación'; end if;
  if not exists (select 1 from public.bookings b join public.spaces s on s.id=b.space_id
    where b.id=p_booking_id and b.status='confirmada' and b.completed_at is not null and b.ends_at<=now()
      and not s.is_demo and s.host_id=(select auth.uid())) then
    raise exception 'Solo puedes calificar al cliente después de completar una renta real';
  end if;
  insert into public.owner_customer_reviews(booking_id,host_id,customer_id,rating,comment)
    select b.id,s.host_id,b.client_id,p_rating,nullif(btrim(coalesce(p_comment,'')),'')
    from public.bookings b join public.spaces s on s.id=b.space_id where b.id=p_booking_id
    returning id into review_id;
  return review_id;
end;
$$;
revoke all on function private.submit_host_customer_review(uuid,integer,text) from public,anon;
grant execute on function private.submit_host_customer_review(uuid,integer,text) to authenticated;
create or replace function public.submit_host_customer_review(p_booking_id uuid,p_rating integer,p_comment text default '')
returns uuid language sql security invoker set search_path = '' as $$ select private.submit_host_customer_review(p_booking_id,p_rating,p_comment); $$;
revoke all on function public.submit_host_customer_review(uuid,integer,text) from public,anon;
grant execute on function public.submit_host_customer_review(uuid,integer,text) to authenticated;

