-- Publica una ficha validada desde Operaciones. Las fotos de anfitriones se
-- mantienen privadas hasta este paso; solo Operaciones puede copiar archivos
-- al bucket público y ejecutar la publicación.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('oficia-space-media', 'oficia-space-media', true, 5242880,
  array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "Operaciones publica fotos de espacios"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'oficia-space-media'
  and (select public.is_oficia_operations())
);

create policy "Operaciones retira fotos de espacios"
on storage.objects for delete to authenticated
using (
  bucket_id = 'oficia-space-media'
  and (select public.is_oficia_operations())
);

create or replace function private.publish_space_draft(p_draft_id uuid, p_image_url text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  draft public.space_drafts%rowtype;
  published_id text;
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
  if p_image_url is null or p_image_url !~* '^https://[^[:space:]]+$' then
    raise exception 'La foto pública no es válida';
  end if;
  if draft.photo_path is not null and left(p_image_url, length(media_prefix)) <> media_prefix then
    raise exception 'La foto del borrador debe copiarse al almacenamiento público de Oficia';
  end if;
  if draft.photo_path is null and p_image_url is distinct from draft.image_url then
    raise exception 'La imagen publicada debe coincidir con la URL aprobada';
  end if;

  insert into public.spaces (
    id, host_id, name, area, city, category, capacity, description, privacy,
    amenities, image_url, gallery_urls, rate_hour_cents, rate_day_cents,
    rate_week_cents, is_demo, is_published, latitude, longitude,
    open_days, opens_at, closes_at
  ) values (
    published_id, draft.owner_id, btrim(draft.name), btrim(draft.area), btrim(draft.city),
    draft.category, draft.capacity, btrim(draft.description), btrim(draft.privacy),
    draft.amenities, p_image_url, array[p_image_url], draft.rate_hour_cents,
    draft.rate_day_cents, draft.rate_week_cents, false, true, draft.latitude,
    draft.longitude, draft.open_days, draft.opens_at, draft.closes_at
  );

  update public.space_drafts
    set status = 'aprobado', rejection_reason = null
    where id = draft.id;
  return published_id;
end;
$$;

revoke all on function private.publish_space_draft(uuid, text) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.publish_space_draft(uuid, text) to authenticated;

create or replace function public.publish_space_draft(p_draft_id uuid, p_image_url text)
returns text
language sql
security invoker
set search_path = ''
as $$ select private.publish_space_draft(p_draft_id, p_image_url); $$;

revoke all on function public.publish_space_draft(uuid, text) from public, anon;
grant execute on function public.publish_space_draft(uuid, text) to authenticated;
