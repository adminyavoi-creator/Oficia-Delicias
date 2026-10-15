create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.space_busy_intervals (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  space_id text not null references public.spaces(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  constraint space_busy_intervals_ordered check (ends_at > starts_at)
);
create index space_busy_intervals_space_start_idx
  on public.space_busy_intervals (space_id, starts_at, ends_at);
alter table public.space_busy_intervals enable row level security;
revoke all on public.space_busy_intervals from public, anon, authenticated;
grant select (space_id, starts_at, ends_at) on public.space_busy_intervals to anon, authenticated;
create policy "Ver solo horarios ocupados de espacios publicados"
on public.space_busy_intervals for select to anon, authenticated
using (exists (
  select 1 from public.spaces s where s.id = space_id
    and s.is_published and not s.is_demo
));

create or replace function private.sync_space_busy_interval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.space_busy_intervals where booking_id = old.id;
    return old;
  end if;
  if new.status = 'confirmada' then
    insert into public.space_busy_intervals (booking_id, space_id, starts_at, ends_at)
    values (new.id, new.space_id, new.starts_at, new.ends_at)
    on conflict (booking_id) do update
      set space_id = excluded.space_id,
          starts_at = excluded.starts_at,
          ends_at = excluded.ends_at;
  else
    delete from public.space_busy_intervals where booking_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.sync_space_busy_interval() from public, anon, authenticated;

insert into public.space_busy_intervals (booking_id, space_id, starts_at, ends_at)
select id, space_id, starts_at, ends_at from public.bookings where status = 'confirmada'
on conflict (booking_id) do update
  set space_id = excluded.space_id,
      starts_at = excluded.starts_at,
      ends_at = excluded.ends_at;

create trigger sync_space_busy_interval_after_booking_change
after insert or update of status, space_id, starts_at, ends_at or delete
on public.bookings
for each row execute function private.sync_space_busy_interval();
