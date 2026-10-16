-- Opiniones verificadas: solo clientes con una renta real finalizada pueden opinar.
-- El ciclo de renta no procesa pagos; anfitrión u Operaciones confirman y finalizan.

alter table public.bookings
  add column completed_at timestamptz;

comment on column public.bookings.completed_at is
  'Marca que el anfitrión completó una renta autorizada después de su hora de salida. No acredita un pago.';

create index bookings_review_eligibility_idx
  on public.bookings (client_id, space_id, ends_at desc)
  where status = 'confirmada' and completed_at is not null;

create table public.space_reviews (
  id uuid primary key default gen_random_uuid(),
  space_id text not null references public.spaces(id) on delete cascade,
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null check (char_length(btrim(comment)) between 3 and 1000),
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create index space_reviews_public_latest_idx
  on public.space_reviews (space_id, created_at desc)
  where is_published;

alter table public.space_reviews enable row level security;
revoke all on public.space_reviews from anon, authenticated;
grant select on public.space_reviews to anon, authenticated;
grant insert (space_id, booking_id, reviewer_id, rating, comment)
  on public.space_reviews to authenticated;

create policy "Opiniones publicadas y moderación de Operaciones"
  on public.space_reviews for select to anon, authenticated
  using (
    (is_published and exists (
      select 1 from public.spaces s
      where s.id = space_reviews.space_id and s.is_published and not s.is_demo
    ))
    or reviewer_id = (select auth.uid())
    or (select public.is_oficia_operations())
  );

create policy "Cliente opina sobre renta terminada"
  on public.space_reviews for insert to authenticated
  with check (
    reviewer_id = (select auth.uid())
    and exists (
      select 1 from public.oficia_profiles p
      where p.user_id = (select auth.uid()) and p.account_type = 'cliente'
    )
    and exists (
      select 1 from public.bookings b
      join public.spaces s on s.id = b.space_id
      where b.id = space_reviews.booking_id
        and b.space_id = space_reviews.space_id
        and b.client_id = (select auth.uid())
        and b.status = 'confirmada'
        and b.completed_at is not null
        and b.ends_at <= now()
        and s.is_published and not s.is_demo
    )
  );

create or replace function public.prepare_space_review()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is null or new.reviewer_id <> (select auth.uid()) then
    raise exception 'Inicia sesión con la cuenta que realizó la renta';
  end if;
  if new.is_published is distinct from true then
    raise exception 'La publicación de opiniones la administra Oficia';
  end if;
  if not exists (
    select 1 from public.bookings b
    join public.spaces s on s.id = b.space_id
    where b.id = new.booking_id and b.space_id = new.space_id
      and b.client_id = new.reviewer_id and b.status = 'confirmada'
      and b.completed_at is not null and b.ends_at <= now()
      and s.is_published and not s.is_demo
  ) then
    raise exception 'Solo puedes calificar un espacio después de una renta completada';
  end if;
  new.comment := btrim(new.comment);
  new.created_at := now();
  return new;
end;
$$;
revoke all on function public.prepare_space_review() from public, anon, authenticated;

create trigger prepare_space_review_before_insert
  before insert on public.space_reviews
  for each row execute function public.prepare_space_review();

create or replace function public.refresh_space_review_summary()
returns trigger language plpgsql security definer set search_path = '' as $$
declare affected_space_id text;
begin
  affected_space_id := coalesce(new.space_id, old.space_id);
  update public.spaces s
    set rating = summary.avg_rating,
        review_count = summary.review_count
  from (
    select round(avg(r.rating)::numeric, 1) as avg_rating, count(*)::integer as review_count
    from public.space_reviews r
    where r.space_id = affected_space_id and r.is_published
  ) summary
  where s.id = affected_space_id;
  return coalesce(new, old);
end;
$$;
revoke all on function public.refresh_space_review_summary() from public, anon, authenticated;

create trigger refresh_space_review_summary_after_insert
  after insert on public.space_reviews
  for each row execute function public.refresh_space_review_summary();

create trigger refresh_space_review_summary_after_moderation
  after update of is_published on public.space_reviews
  for each row when (old.is_published is distinct from new.is_published)
  execute function public.refresh_space_review_summary();

create or replace view public.space_review_summaries
with (security_invoker = true) as
select space_id, round(avg(rating)::numeric, 1) as average_rating, count(*)::integer as review_count
from public.space_reviews
where is_published
group by space_id;
grant select on public.space_review_summaries to anon, authenticated;

create or replace function public.moderate_space_review(p_review_id uuid, p_publish boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not (select public.is_oficia_operations()) then
    raise exception 'Solo Operaciones puede moderar opiniones';
  end if;
  update public.space_reviews set is_published = p_publish where id = p_review_id;
  if not found then raise exception 'Opinión no encontrada'; end if;
end;
$$;
revoke all on function public.moderate_space_review(uuid, boolean) from public, anon;
grant execute on function public.moderate_space_review(uuid, boolean) to authenticated;

-- Regresa el flujo de autorización al anfitrión y a Operaciones, sin condiciones de pago.
revoke update on public.bookings from anon, authenticated;
grant update (status, rejection_reason, completed_at) on public.bookings to authenticated;

drop policy if exists "Cliente u Operaciones actualiza solicitudes" on public.bookings;
drop policy if exists "Cliente reporta transferencia propia" on public.bookings;
drop policy if exists "Operaciones gestiona solicitudes" on public.bookings;
create policy "Anfitrion u Operaciones gestiona rentas"
  on public.bookings for update to authenticated
  using (
    (select public.is_oficia_operations())
    or exists (select 1 from public.spaces s
      where s.id = bookings.space_id and s.host_id = (select auth.uid()))
  )
  with check (
    (select public.is_oficia_operations())
    or exists (select 1 from public.spaces s
      where s.id = bookings.space_id and s.host_id = (select auth.uid()))
  );

create or replace function public.review_booking()
returns trigger language plpgsql set search_path = '' as $$
declare actor_is_host boolean;
begin
  actor_is_host := exists (
    select 1 from public.spaces s where s.id = old.space_id and s.host_id = (select auth.uid())
  );
  if not actor_is_host and not (select public.is_oficia_operations()) then
    raise exception 'Solo el anfitrión del espacio u Operaciones puede actualizar la renta';
  end if;

  if row(new.id,new.client_id,new.space_id,new.local_date,new.local_time,new.starts_at,
      new.ends_at,new.unit,new.quantity,new.total_cents,new.created_at,new.transfer_reference,
      new.payer_reference,new.payment_status,new.payment_reported_at,new.payment_reviewed_by,
      new.payment_reviewed_at,new.payment_review_note) is distinct from
     row(old.id,old.client_id,old.space_id,old.local_date,old.local_time,old.starts_at,
      old.ends_at,old.unit,old.quantity,old.total_cents,old.created_at,old.transfer_reference,
      old.payer_reference,old.payment_status,old.payment_reported_at,old.payment_reviewed_by,
      old.payment_reviewed_at,old.payment_review_note) then
    raise exception 'Los datos de la solicitud y sus campos de pago son de solo lectura';
  end if;

  if new.status is distinct from old.status then
    if old.status <> 'pendiente' or new.status not in ('confirmada','rechazada')
      or old.completed_at is not null or new.completed_at is not null then
      raise exception 'Esta solicitud ya fue revisada';
    end if;
    if new.status = 'rechazada' then
      if nullif(btrim(new.rejection_reason), '') is null then
        raise exception 'Indica por qué no puedes aceptar la solicitud';
      end if;
      new.rejection_reason := btrim(new.rejection_reason);
    else
      if exists (select 1 from public.spaces s where s.id = new.space_id and s.is_demo) then
        raise exception 'Un espacio de muestra no admite rentas autorizadas';
      end if;
      perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.space_id, 0));
      perform public.assert_booking_availability(new.space_id,new.local_date,new.local_time,new.starts_at,new.ends_at,new.unit);
      if exists (select 1 from public.bookings b where b.space_id = new.space_id
        and b.id <> new.id and b.status = 'confirmada'
        and b.starts_at < new.ends_at and b.ends_at > new.starts_at) then
        raise exception 'El espacio ya está confirmado en ese horario';
      end if;
      new.rejection_reason := null;
    end if;
  elsif new.completed_at is distinct from old.completed_at then
    if old.status <> 'confirmada' or old.completed_at is not null or new.completed_at is null
      or old.ends_at > now() then
      raise exception 'La renta solo se puede finalizar después de la hora de salida';
    end if;
    new.completed_at := now();
  elsif new.rejection_reason is distinct from old.rejection_reason then
    raise exception 'El motivo solo puede guardarse al rechazar la solicitud';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.guard_booking_updates()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Inicia sesión para continuar'; end if;
  if not (select public.is_oficia_operations()) and not exists (
    select 1 from public.spaces s where s.id = old.space_id and s.host_id = (select auth.uid())
  ) then
    raise exception 'Solo el anfitrión del espacio u Operaciones puede actualizar la renta';
  end if;
  return new;
end;
$$;

update public.spaces set rating = null, review_count = 0 where is_demo;

comment on table public.space_reviews is
  'Opiniones verificadas: una por cliente y renta real completada; las opiniones de muestra no se permiten.';
