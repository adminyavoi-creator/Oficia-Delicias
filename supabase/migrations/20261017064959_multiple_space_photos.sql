alter table public.space_drafts
  add column photo_paths text[] not null default '{}'::text[],
  add constraint space_drafts_photo_paths_limit check (
    cardinality(photo_paths) <= 10 and array_position(photo_paths, null) is null
  );

grant insert (photo_paths) on public.space_drafts to authenticated;

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
    or (
      cardinality(new.photo_paths) = 0
      and new.photo_path is null
      and new.image_url !~* '^https://[^[:space:]]+$'
    )
  ) then
    raise exception 'Completa descripción, privacidad, tarifas y foto antes de enviar a revisión';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.validate_oficia_draft_details()
returns trigger language plpgsql set search_path = '' as $$
declare
  expected_photo_pattern text := '^' || new.owner_id::text || '/' || new.id::text || '/[0-9a-f-]{36}[.](jpg|jpeg|png|webp)$';
begin
  if new.photo_path is not null and new.photo_path !~ expected_photo_pattern then
    raise exception 'La foto debe pertenecer al borrador de la cuenta anfitriona';
  end if;
  if cardinality(new.photo_paths) > 10 or array_position(new.photo_paths, null) is not null then
    raise exception 'El espacio puede tener hasta 10 fotos válidas';
  end if;
  if exists (
    select 1 from unnest(new.photo_paths) as item(path)
    where item.path !~ expected_photo_pattern
  ) then
    raise exception 'Las fotos deben pertenecer al borrador de la cuenta anfitriona';
  end if;
  if cardinality(new.photo_paths) > 0 and new.photo_path is distinct from new.photo_paths[1] then
    raise exception 'La portada debe ser la primera foto de la galería';
  end if;
  if new.status = 'en_revision' and (
    length(btrim(new.address)) < 8 or length(btrim(new.city)) < 3
    or (
      cardinality(new.photo_paths) = 0
      and new.photo_path is null
      and new.image_url !~* '^https://[^[:space:]]+$'
    )
  ) then
    raise exception 'Completa dirección, ciudad y foto antes de enviar a revisión';
  end if;
  return new;
end;
$$;

create or replace function private.publish_space_draft(
  p_draft_id uuid, p_image_url text, p_gallery_urls text[]
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  draft public.space_drafts%rowtype;
  published_id text;
  private_photo_paths text[];
  media_prefix constant text := 'https://vfvqmlsgqxiarmbquhco.supabase.co/storage/v1/object/public/oficia-space-media/';
begin
  if (select auth.uid()) is null or not coalesce((select public.is_oficia_operations()), false) then
    raise exception 'Solo Operaciones puede publicar un espacio';
  end if;

  select * into draft
    from public.space_drafts
    where id = p_draft_id
    for update;
  if not found then
    raise exception 'No se encontró el borrador';
  end if;

  published_id := draft.id::text;
  if draft.status = 'aprobado' and exists (
    select 1 from public.spaces s where s.id = published_id and s.host_id = draft.owner_id and not s.is_demo
  ) then
    return published_id;
  end if;
  if draft.status not in ('en_revision', 'aprobado') then
    raise exception 'El borrador debe estar en revisión antes de publicarse';
  end if;

  if length(btrim(draft.name)) < 3 or length(btrim(draft.area)) < 3
     or length(btrim(draft.city)) < 3 or length(btrim(draft.address)) < 8
     or length(btrim(draft.description)) < 20 or length(btrim(draft.privacy)) < 10
     or draft.rate_hour_cents <= 0 or draft.rate_day_cents <= 0 or draft.rate_week_cents <= 0
     or cardinality(draft.open_days) = 0 or draft.closes_at <= draft.opens_at
     or not ('Internet rápido' = any(draft.amenities)) then
    raise exception 'La ficha requiere datos completos, horario, tarifas e internet';
  end if;
  if draft.latitude is null or draft.longitude is null then
    raise exception 'Marca la ubicación exacta del espacio en el mapa';
  end if;
  if p_gallery_urls is null or cardinality(p_gallery_urls) < 1 or cardinality(p_gallery_urls) > 10
     or p_gallery_urls[1] is distinct from p_image_url
     or exists (
       select 1 from unnest(p_gallery_urls) as item(url)
       where item.url is null or item.url !~* '^https://[^[:space:]]+$'
     ) then
    raise exception 'La galería debe incluir de 1 a 10 fotos válidas';
  end if;

  if cardinality(draft.photo_paths) > 0 then
    private_photo_paths := draft.photo_paths;
  elsif draft.photo_path is not null then
    private_photo_paths := array[draft.photo_path];
  else
    private_photo_paths := '{}'::text[];
  end if;

  if cardinality(private_photo_paths) > 0 then
    if cardinality(p_gallery_urls) <> cardinality(private_photo_paths)
       or exists (
         select 1 from unnest(p_gallery_urls) as item(url)
         where left(item.url, length(media_prefix || draft.id::text || '/'))
           <> media_prefix || draft.id::text || '/'
       ) then
      raise exception 'Cada foto privada debe copiarse a la galería pública del espacio';
    end if;
  elsif cardinality(p_gallery_urls) <> 1 or p_image_url is distinct from draft.image_url then
    raise exception 'La imagen publicada debe coincidir con la imagen aprobada';
  end if;

  insert into public.spaces (
    id, host_id, name, area, city, category, capacity, description, privacy,
    amenities, image_url, gallery_urls, rate_hour_cents, rate_day_cents,
    rate_week_cents, is_demo, is_published, latitude, longitude,
    open_days, opens_at, closes_at
  ) values (
    published_id, draft.owner_id, btrim(draft.name), btrim(draft.area), btrim(draft.city),
    draft.category, draft.capacity, btrim(draft.description), btrim(draft.privacy),
    draft.amenities, p_image_url, p_gallery_urls, draft.rate_hour_cents,
    draft.rate_day_cents, draft.rate_week_cents, false, true, draft.latitude,
    draft.longitude, draft.open_days, draft.opens_at, draft.closes_at
  );

  update public.space_drafts
    set status = 'aprobado', rejection_reason = null
    where id = draft.id;
  return published_id;
end;
$$;

revoke all on function private.publish_space_draft(uuid, text, text[]) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.publish_space_draft(uuid, text, text[]) to authenticated;

create or replace function private.publish_space_draft(p_draft_id uuid, p_image_url text)
returns text
language sql
security definer
set search_path = ''
as $$ select private.publish_space_draft(p_draft_id, p_image_url, array[p_image_url]); $$;

revoke all on function private.publish_space_draft(uuid, text) from public, anon;
grant execute on function private.publish_space_draft(uuid, text) to authenticated;

create or replace function public.publish_space_draft(p_draft_id uuid, p_image_url text)
returns text
language sql
security invoker
set search_path = ''
as $$ select private.publish_space_draft(p_draft_id, p_image_url); $$;

revoke all on function public.publish_space_draft(uuid, text) from public, anon;
grant execute on function public.publish_space_draft(uuid, text) to authenticated;

create or replace function public.publish_space_draft(
  p_draft_id uuid, p_image_url text, p_gallery_urls text[]
)
returns text
language sql
security invoker
set search_path = ''
as $$ select private.publish_space_draft(p_draft_id, p_image_url, p_gallery_urls); $$;

revoke all on function public.publish_space_draft(uuid, text, text[]) from public, anon;
grant execute on function public.publish_space_draft(uuid, text, text[]) to authenticated;
