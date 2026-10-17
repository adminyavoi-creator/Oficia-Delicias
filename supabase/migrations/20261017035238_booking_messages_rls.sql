create table if not exists public.booking_messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists booking_messages_thread_idx on public.booking_messages(booking_id,created_at);
alter table public.booking_messages enable row level security;
revoke all on public.booking_messages from public,anon,authenticated;
grant select,insert on public.booking_messages to authenticated;
create policy "Partes de renta autorizada leen chat" on public.booking_messages for select to authenticated
  using (exists (select 1 from public.bookings b join public.spaces s on s.id=b.space_id where b.id=booking_id
    and b.status='confirmada' and not s.is_demo and ((b.client_id=(select auth.uid())) or (s.host_id=(select auth.uid())))));
create policy "Partes de renta autorizada escriben chat" on public.booking_messages for insert to authenticated
  with check (sender_id=(select auth.uid()) and char_length(btrim(body)) between 1 and 2000 and exists (
    select 1 from public.bookings b join public.spaces s on s.id=b.space_id where b.id=booking_id
    and b.status='confirmada' and not s.is_demo and ((b.client_id=(select auth.uid())) or (s.host_id=(select auth.uid())))));
