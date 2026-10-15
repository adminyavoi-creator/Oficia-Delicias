-- El punto literal del nombre de archivo se comprueba sin escapes ambiguos.
create or replace function public.validate_oficia_draft_details()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.photo_path is not null and new.photo_path !~
     ('^' || new.owner_id::text || '/[0-9a-f-]{36}/[0-9a-f-]{36}[.](jpg|jpeg|png|webp)$') then
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
