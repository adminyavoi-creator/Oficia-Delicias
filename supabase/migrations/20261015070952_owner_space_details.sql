-- Ficha privada de anfitrión. Los horarios son locales de Delicias.
alter table public.space_drafts
  add column address text not null default '' check (char_length(address) <= 250),
  add column latitude double precision check (latitude between -90 and 90),
  add column longitude double precision check (longitude between -180 and 180),
  add column open_days integer[] not null default '{1,2,3,4,5}',
  add column opens_at time not null default '08:00',
  add column closes_at time not null default '18:00',
  add column photo_path text check (char_length(photo_path) <= 500),
  add constraint space_drafts_coordinates_pair check ((latitude is null) = (longitude is null)),
  add constraint space_drafts_open_hours check (closes_at > opens_at),
  add constraint space_drafts_open_days check (
    cardinality(open_days) between 1 and 7
    and open_days <@ array[0,1,2,3,4,5,6]
  );

grant insert (address, latitude, longitude, open_days, opens_at, closes_at, photo_path)
  on public.space_drafts to authenticated;

create or replace function public.guard_space_draft()
returns trigger language plpgsql set search_path = '' as $$
declare is_ops boolean := (select public.is_oficia_operations());
begin
  if tg_op = 'INSERT' then
    if new.owner_id <> (select auth.uid()) or new.status <> 'borrador' then
      raise exception 'Solo puedes crear un borrador propio';
    end if;
    new.created_at := now();
  else
    if new.id <> old.id or new.owner_id <> old.owner_id or new.created_at <> old.created_at then
      raise exception 'No puedes transferir un espacio ni cambiar su identidad';
    end if;
    if not is_ops then
      if old.owner_id <> (select auth.uid()) or old.status not in ('borrador','rechazado')
         or new.status not in ('borrador','en_revision')
         or new.rejection_reason is distinct from old.rejection_reason then
        raise exception 'Este borrador ya no admite cambios';
      end if;
    end if;
  end if;
  if new.status = 'en_revision' and (
    length(btrim(new.name)) < 3 or length(btrim(new.area)) < 3
    or length(btrim(new.description)) < 20 or length(btrim(new.privacy)) < 10
    or new.rate_hour_cents <= 0 or new.rate_day_cents <= 0 or new.rate_week_cents <= 0
    or (new.photo_path is null and new.image_url !~* '^https://[^[:space:]]+$')
  ) then
    raise exception 'Completa descripción, privacidad, tarifas y foto antes de enviar a revisión';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create function public.validate_oficia_draft_details()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.photo_path is not null and new.photo_path !~
     ('^' || new.owner_id::text || '/[0-9a-f-]{36}/[0-9a-f-]{36}\\.(jpg|jpeg|png|webp)$') then
    raise exception 'La foto debe pertenecer a la cuenta anfitriona';
  end if;
  if new.status = 'en_revision' and (
    length(btrim(new.address)) < 8 or length(btrim(new.city)) < 3
    or (new.photo_path is null and new.image_url !~* '^https://[^[:space:]]+$')
  ) then
    raise exception 'Completa dirección, ciudad y foto antes de enviar a revisión';
  end if;
  return new;
end;
$$;
create trigger validate_oficia_draft_details_before_write
before insert or update on public.space_drafts
for each row execute function public.validate_oficia_draft_details();

-- La imagen del borrador permanece privada hasta su publicación comercial.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('oficia-space-drafts', 'oficia-space-drafts', false, 5242880,
  array['image/jpeg','image/png','image/webp']);

create policy "Anfitrion sube fotos propias de borrador"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'oficia-space-drafts'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select 1 from public.oficia_profiles p
    where p.user_id = (select auth.uid()) and p.account_type = 'anfitrion')
);
create policy "Anfitrion y Operaciones ven fotos de borrador"
on storage.objects for select to authenticated
using (
  bucket_id = 'oficia-space-drafts'
  and ((storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_oficia_operations()))
);
create policy "Anfitrion retira fotos propias de borrador"
on storage.objects for delete to authenticated
using (
  bucket_id = 'oficia-space-drafts'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
