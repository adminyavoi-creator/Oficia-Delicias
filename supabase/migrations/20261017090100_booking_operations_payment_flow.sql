begin;

alter table public.bookings
  add column if not exists intent_expires_at timestamptz,
  add column if not exists agreement_closed_at timestamptz,
  add column if not exists agreement_closed_by uuid references auth.users(id);

comment on column public.bookings.intent_expires_at is 'Reserva temporal del horario; vence tras 24 horas si el cliente no envía comprobante.';
comment on column public.bookings.agreement_closed_at is 'Operaciones cerró el acuerdo después de confirmar el pago externo.';
create index if not exists bookings_intent_expiry_idx
  on public.bookings(intent_expires_at)
  where status in ('pendiente','aceptada_anfitrion') and payment_status <> 'reportado';

create table if not exists public.booking_payment_proofs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  object_path text not null unique,
  file_name text not null check (char_length(btrim(file_name)) between 1 and 160),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','application/pdf')),
  size_bytes bigint not null check (size_bytes between 1 and 8000000),
  created_at timestamptz not null default now()
);
create index if not exists booking_payment_proofs_booking_idx
  on public.booking_payment_proofs(booking_id,created_at desc);
alter table public.booking_payment_proofs enable row level security;
revoke all on public.booking_payment_proofs from public,anon,authenticated;
grant select on public.booking_payment_proofs to authenticated;
drop policy if exists "Partes pueden ver comprobantes de pago" on public.booking_payment_proofs;
create policy "Cliente y Operaciones ven comprobantes de la solicitud"
  on public.booking_payment_proofs for select to authenticated
  using (exists (
    select 1 from public.bookings b join public.spaces s on s.id=b.space_id
    where b.id=booking_payment_proofs.booking_id and not s.is_demo
      and (b.client_id=(select auth.uid()) or (select private.is_oficia_operations()))
  ));

-- La cuenta bancaria solo se entrega mediante un RPC limitado a la reserva del cliente.
drop policy if exists "Datos bancarios visibles" on public.transfer_settings;
drop policy if exists "Datos bancarios disponibles" on public.transfer_settings;
drop policy if exists "Operaciones actualiza datos bancarios" on public.transfer_settings;
revoke all on public.transfer_settings from public,anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('oficia-booking-proofs','oficia-booking-proofs',false,8000000,array['image/jpeg','image/png','application/pdf'])
on conflict (id) do update
set public=false,file_size_limit=8000000,allowed_mime_types=array['image/jpeg','image/png','application/pdf'];

drop policy if exists "Cliente carga comprobante de renta" on storage.objects;
create policy "Cliente carga comprobante de renta"
  on storage.objects for insert to authenticated
  with check (
    bucket_id='oficia-booking-proofs'
    and (storage.foldername(name))[2]=(select auth.uid())::text
    and exists (
      select 1 from public.bookings b join public.spaces s on s.id=b.space_id
      where b.id::text=(storage.foldername(name))[1] and b.client_id=(select auth.uid())
        and not s.is_demo and b.status in ('pendiente','aceptada_anfitrion')
        and (b.intent_expires_at is null or b.intent_expires_at>now() or b.payment_status='reportado')
    )
  );
drop policy if exists "Cliente y Operaciones leen comprobantes privados" on storage.objects;
drop policy if exists "Cliente elimina carga incompleta de su solicitud" on storage.objects;
create policy "Cliente elimina carga incompleta de su solicitud"
  on storage.objects for delete to authenticated
  using (bucket_id='oficia-booking-proofs' and (storage.foldername(name))[2]=(select auth.uid())::text
    and not exists(select 1 from public.booking_payment_proofs p where p.object_path=storage.objects.name));
create policy "Cliente y Operaciones leen comprobantes privados"
  on storage.objects for select to authenticated
  using (
    bucket_id='oficia-booking-proofs'
    and exists (
      select 1 from public.booking_payment_proofs p
      join public.bookings b on b.id=p.booking_id
      join public.spaces s on s.id=b.space_id
      where p.object_path=storage.objects.name and not s.is_demo
        and (b.client_id=(select auth.uid()) or (select private.is_oficia_operations()))
    )
  );

create or replace function private.assert_booking_availability(
  p_space_id text,p_local_date date,p_local_time time,
  p_starts_at timestamptz,p_ends_at timestamptz,p_unit text,p_booking_id uuid
) returns void
language plpgsql security definer set search_path = '' as $$
declare selected_space public.spaces%rowtype;
begin
  select * into selected_space from public.spaces where id=p_space_id;
  if not found or not selected_space.is_published or selected_space.is_demo then
    raise exception 'El espacio no está disponible para renta';
  end if;
  if not (extract(dow from p_local_date)::integer=any(selected_space.open_days))
    or p_local_time<selected_space.opens_at or p_local_time>=selected_space.closes_at then
    raise exception 'El espacio está cerrado en el horario elegido';
  end if;
  if p_unit='Hora'
    and (p_ends_at at time zone 'America/Chihuahua')::date=p_local_date
    and (p_ends_at at time zone 'America/Chihuahua')::time>selected_space.closes_at then
    raise exception 'La estancia termina después del cierre';
  end if;
  if p_unit='Hora' and (p_ends_at at time zone 'America/Chihuahua')::date<>p_local_date then
    raise exception 'La estancia por horas debe terminar el mismo día';
  end if;
  if exists (
    select 1 from public.space_closures c where c.space_id=p_space_id
      and c.closed_on>=p_local_date
      and c.closed_on<(p_ends_at at time zone 'America/Chihuahua')::date
        + case when (p_ends_at at time zone 'America/Chihuahua')::time>time '00:00' then 1 else 0 end
  ) then raise exception 'El espacio tiene un cierre durante esa estancia'; end if;
  if p_ends_at<=p_starts_at then raise exception 'El horario de renta no es válido'; end if;
  if exists (
    select 1 from public.space_busy_intervals i
    join public.bookings b on b.id=i.booking_id
    where i.space_id=p_space_id and i.booking_id is distinct from p_booking_id
      and i.starts_at<p_ends_at and i.ends_at>p_starts_at
      and b.status in ('pendiente','aceptada_anfitrion','confirmada')
      and (b.intent_expires_at is null or b.intent_expires_at>now() or b.payment_status='reportado' or b.status='confirmada')
  ) then raise exception 'El horario ya no está disponible'; end if;
end; $$;
revoke all on function private.assert_booking_availability(text,date,time,timestamptz,timestamptz,text,uuid) from public,anon,authenticated;

create or replace function public.assert_booking_availability(
  p_space_id text,p_local_date date,p_local_time time,
  p_starts_at timestamptz,p_ends_at timestamptz,p_unit text
) returns void
language sql security definer set search_path = '' as $$
  select private.assert_booking_availability(p_space_id,p_local_date,p_local_time,p_starts_at,p_ends_at,p_unit,null::uuid);
$$;
revoke all on function public.assert_booking_availability(text,date,time,timestamptz,timestamptz,text) from public,anon;
grant execute on function public.assert_booking_availability(text,date,time,timestamptz,timestamptz,text) to authenticated;

create or replace function public.prepare_booking() returns trigger
language plpgsql set search_path = '' as $$
declare selected_space public.spaces%rowtype;
begin
  if (select auth.uid()) is null or new.client_id<>(select auth.uid()) then raise exception 'Debes iniciar sesión para solicitar un espacio'; end if;
  select * into selected_space from public.spaces where id=new.space_id and is_published;
  if not found or selected_space.is_demo then raise exception 'Solo se pueden solicitar espacios reales publicados'; end if;
  new.starts_at := (new.local_date+new.local_time) at time zone 'America/Chihuahua';
  if new.unit='Hora' then
    new.ends_at:=new.starts_at+make_interval(hours=>new.quantity);
    new.total_cents:=selected_space.rate_hour_cents*new.quantity;
  elsif new.unit='Día' then
    new.ends_at:=(new.local_date+new.quantity+new.local_time) at time zone 'America/Chihuahua';
    new.total_cents:=selected_space.rate_day_cents*new.quantity;
  else
    new.ends_at:=(new.local_date+new.quantity*7+new.local_time) at time zone 'America/Chihuahua';
    new.total_cents:=selected_space.rate_week_cents*new.quantity;
  end if;
  if new.starts_at<=now() or new.starts_at>now()+interval '180 days' then raise exception 'Elige una fecha futura dentro de los próximos 180 días'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.space_id,0));
  perform private.assert_booking_availability(new.space_id,new.local_date,new.local_time,new.starts_at,new.ends_at,new.unit,null::uuid);
  new.status:='pendiente'; new.rejection_reason:=null; new.payment_status:='pendiente'; new.payer_reference:=null;
  new.payment_reported_at:=null; new.payment_reviewed_by:=null; new.payment_reviewed_at:=null; new.payment_review_note:=null;
  new.intent_expires_at:=now()+interval '24 hours';
  new.agreement_closed_at:=null; new.agreement_closed_by:=null;
  new.created_at:=now(); new.updated_at:=now();
  return new;
end; $$;

create or replace function private.sync_space_busy_interval() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op='DELETE' then
    delete from public.space_busy_intervals where booking_id=old.id;
    return old;
  end if;
  if new.status='confirmada' or (
    new.status in ('pendiente','aceptada_anfitrion')
    and (new.intent_expires_at is null or new.intent_expires_at>now() or new.payment_status='reportado')
  ) then
    insert into public.space_busy_intervals(booking_id,space_id,starts_at,ends_at)
      values(new.id,new.space_id,new.starts_at,new.ends_at)
      on conflict(booking_id) do update set space_id=excluded.space_id,starts_at=excluded.starts_at,ends_at=excluded.ends_at;
  else
    delete from public.space_busy_intervals where booking_id=new.id;
  end if;
  return new;
end; $$;

create or replace function public.review_booking() returns trigger
language plpgsql set search_path = '' as $$
declare actor_is_host boolean; actor_is_operations boolean; system_expiry boolean;
begin
  actor_is_host:=exists(select 1 from public.spaces s where s.id=old.space_id and s.host_id=(select auth.uid()) and not s.is_demo);
  actor_is_operations:=(select private.is_oficia_operations());
  system_expiry:=current_user='postgres' and (select auth.uid()) is null
    and old.status in ('pendiente','aceptada_anfitrion') and new.status='cancelada'
    and old.payment_status<>'reportado' and old.intent_expires_at<=now();

  if not actor_is_host and not actor_is_operations and not system_expiry then
    raise exception 'Solo Operaciones puede revisar solicitudes';
  end if;
  if row(new.id,new.client_id,new.space_id,new.local_date,new.local_time,new.starts_at,new.ends_at,
      new.unit,new.quantity,new.total_cents,new.created_at,new.transfer_reference,new.payer_reference,
      new.payment_status,new.payment_reported_at,new.payment_reviewed_by,new.payment_reviewed_at,new.payment_review_note)
     is distinct from
     row(old.id,old.client_id,old.space_id,old.local_date,old.local_time,old.starts_at,old.ends_at,
      old.unit,old.quantity,old.total_cents,old.created_at,old.transfer_reference,old.payer_reference,
      old.payment_status,old.payment_reported_at,old.payment_reviewed_by,old.payment_reviewed_at,old.payment_review_note)
    then raise exception 'Los datos de la solicitud y el pago son de solo lectura'; end if;
  if not actor_is_operations and (new.intent_expires_at is distinct from old.intent_expires_at
    or new.agreement_closed_at is distinct from old.agreement_closed_at
    or new.agreement_closed_by is distinct from old.agreement_closed_by) then
    raise exception 'Los controles del acuerdo son de solo lectura'; end if;

  if system_expiry then
    new.rejection_reason:='La solicitud venció porque no se recibió el comprobante en 24 horas.';
  elsif new.status is distinct from old.status then
    if actor_is_host and old.status='confirmada' and new.status='confirmada'
      and old.completed_at is null and new.completed_at is not null and old.ends_at<=now() then
      new.completed_at:=now();
    elsif actor_is_operations and old.status in ('pendiente','aceptada_anfitrion')
      and new.status in ('confirmada','rechazada') and old.completed_at is null and new.completed_at is null then
      new.operations_reviewed_by:=(select auth.uid());
      new.operations_reviewed_at:=now();
      if new.status='confirmada' then
        if not exists(select 1 from public.bookings b join public.spaces s on s.id=b.space_id
          where b.id=new.id and not s.is_demo and s.is_published and b.payment_status='verificado'
            and b.agreement_closed_at is not null) then
          raise exception 'Confirma el pago y cierra el acuerdo antes de autorizar';
        end if;
        perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.space_id,0));
        perform private.assert_booking_availability(new.space_id,new.local_date,new.local_time,new.starts_at,new.ends_at,new.unit,new.id);
        new.rejection_reason:=null; new.intent_expires_at:=null;
      else
        if nullif(btrim(new.rejection_reason),'') is null then raise exception 'Indica por qué se devuelve la solicitud'; end if;
        new.rejection_reason:=btrim(new.rejection_reason);
      end if;
    elsif system_expiry then
      null;
    else
      raise exception 'Solo Operaciones puede autorizar o rechazar esta solicitud';
    end if;
  elsif new.completed_at is distinct from old.completed_at then
    if old.status<>'confirmada' or old.completed_at is not null or new.completed_at is null or old.ends_at>now() then
      raise exception 'La renta solo se puede finalizar después de la hora de salida';
    end if;
    new.completed_at:=now();
  elsif new.rejection_reason is distinct from old.rejection_reason then
    raise exception 'El motivo solo puede guardarse al revisar la solicitud';
  end if;
  new.updated_at:=now();
  return new;
end; $$;

create or replace function public.guard_booking_updates() returns trigger
language plpgsql set search_path = '' as $$
declare actor_is_client boolean; actor_is_host boolean; actor_is_operations boolean; system_expiry boolean;
begin
  system_expiry:=current_user='postgres' and (select auth.uid()) is null
    and old.status in ('pendiente','aceptada_anfitrion') and new.status='cancelada'
    and old.payment_status<>'reportado' and old.intent_expires_at<=now();
  if system_expiry then return new; end if;
  if (select auth.uid()) is null then raise exception 'Inicia sesión para continuar'; end if;
  actor_is_client:=old.client_id=(select auth.uid());
  actor_is_host:=exists(select 1 from public.spaces s where s.id=old.space_id and s.host_id=(select auth.uid()) and not s.is_demo);
  actor_is_operations:=(select private.is_oficia_operations());

  if actor_is_client then
    if old.status in ('pendiente','aceptada_anfitrion') and old.payment_status in ('pendiente','rechazado')
      and new.status=old.status and new.client_id=old.client_id and new.space_id=old.space_id
      and new.local_date=old.local_date and new.local_time=old.local_time and new.starts_at=old.starts_at
      and new.ends_at=old.ends_at and new.unit=old.unit and new.quantity=old.quantity
      and new.total_cents=old.total_cents and new.created_at=old.created_at
      and new.transfer_reference=old.transfer_reference and new.completed_at is not distinct from old.completed_at
      and new.rejection_reason is not distinct from old.rejection_reason
      and new.payment_status='reportado' and new.payment_reported_at is not null
      and new.payment_reviewed_by is not distinct from old.payment_reviewed_by
      and new.payment_reviewed_at is not distinct from old.payment_reviewed_at
      and new.payment_review_note is not distinct from old.payment_review_note
      and new.agreement_closed_at is not distinct from old.agreement_closed_at
      and new.agreement_closed_by is not distinct from old.agreement_closed_by
      and (new.intent_expires_at is not distinct from old.intent_expires_at or new.intent_expires_at is null)
      and exists(select 1 from public.booking_payment_proofs p where p.booking_id=old.id and p.uploaded_by=old.client_id)
    then new.updated_at:=now(); return new; end if;
    raise exception 'El cliente solo puede reportar un comprobante de su solicitud';
  end if;
  if not actor_is_host and not actor_is_operations then raise exception 'Solo el anfitrión u Operaciones puede actualizar la renta'; end if;
  return new;
end; $$;

-- Una solicitud real aparta el horario mientras se completa el proceso manual.
drop policy if exists "Anfitrion responde solicitudes propias" on public.bookings;
create policy "Dueño completa renta autorizada"
  on public.bookings for update to authenticated
  using (exists(select 1 from public.spaces s where s.id=bookings.space_id and s.host_id=(select auth.uid())
      and not s.is_demo and bookings.status='confirmada' and bookings.completed_at is null and bookings.ends_at<=now()))
  with check (exists(select 1 from public.spaces s where s.id=bookings.space_id and s.host_id=(select auth.uid())
      and not s.is_demo and bookings.status='confirmada' and bookings.completed_at is not null));

drop policy if exists "Partes de renta autorizada leen chat" on public.booking_messages;
drop policy if exists "Partes de renta autorizada escriben chat" on public.booking_messages;
create policy "Participantes leen conversación de renta"
  on public.booking_messages for select to authenticated
  using (exists(select 1 from public.bookings b join public.spaces s on s.id=b.space_id
    where b.id=booking_id and not s.is_demo and (
      (b.client_id=(select auth.uid()) and b.status in ('pendiente','aceptada_anfitrion','confirmada'))
      or ((select private.is_oficia_operations()) and b.status in ('pendiente','aceptada_anfitrion'))
      or (s.host_id=(select auth.uid()) and b.status='confirmada')
    )));
create policy "Participantes escriben conversación de renta"
  on public.booking_messages for insert to authenticated
  with check (sender_id=(select auth.uid()) and char_length(btrim(body)) between 1 and 2000 and exists(
    select 1 from public.bookings b join public.spaces s on s.id=b.space_id
    where b.id=booking_id and not s.is_demo and (
      (b.client_id=(select auth.uid()) and b.status in ('pendiente','aceptada_anfitrion','confirmada'))
      or ((select private.is_oficia_operations()) and b.status in ('pendiente','aceptada_anfitrion'))
      or (s.host_id=(select auth.uid()) and b.status='confirmada')
    )));

do $$
begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime')
    and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='booking_payment_proofs') then
    alter publication supabase_realtime add table public.booking_payment_proofs;
  end if;
end $$;

create or replace function private.booking_customer_contact(p_booking_id uuid)
returns table(display_name text,email text,phone text,avatar_url text)
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Inicia sesión para continuar'; end if;
  return query
  select coalesce(nullif(u.raw_user_meta_data->>'full_name',''),nullif(u.raw_user_meta_data->>'name',''),
      nullif(u.raw_user_meta_data->>'display_name',''),'Cliente Oficia'),
    u.email,nullif(u.phone,''),coalesce(nullif(u.raw_user_meta_data->>'avatar_url',''),nullif(u.raw_user_meta_data->>'picture',''))
  from public.bookings b join public.spaces s on s.id=b.space_id join auth.users u on u.id=b.client_id
  where b.id=p_booking_id and not s.is_demo and (
    ((select private.is_oficia_operations()) and b.status in ('pendiente','aceptada_anfitrion'))
    or (s.host_id=(select auth.uid()) and b.status='confirmada')
  );
  if not found then raise exception 'Los datos del cliente solo están disponibles para Operaciones durante la solicitud y para el dueño después de autorizar'; end if;
end; $$;
revoke all on function private.booking_customer_contact(uuid) from public,anon,authenticated;
grant execute on function private.booking_customer_contact(uuid) to authenticated;

create or replace function public.booking_customer_contact(p_booking_id uuid)
returns table(display_name text,email text,phone text,avatar_url text)
language sql security definer set search_path = '' as $$
  select * from private.booking_customer_contact(p_booking_id);
$$;
revoke all on function public.booking_customer_contact(uuid) from public,anon;
grant execute on function public.booking_customer_contact(uuid) to authenticated;

create or replace function public.booking_payment_instructions(p_booking_id uuid)
returns table(bank_name text,clabe text,beneficiary text,instructions text,transfer_reference text,total_cents integer)
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Inicia sesión para continuar'; end if;
  return query
  select ts.bank_name,ts.clabe,ts.beneficiary,ts.instructions,b.transfer_reference,b.total_cents
  from public.bookings b join public.spaces s on s.id=b.space_id
  join public.transfer_settings ts on ts.id=1
  where b.id=p_booking_id and b.client_id=(select auth.uid()) and not s.is_demo and s.is_published
    and b.status in ('pendiente','aceptada_anfitrion');
end; $$;
revoke all on function public.booking_payment_instructions(uuid) from public,anon;
grant execute on function public.booking_payment_instructions(uuid) to authenticated;

create or replace function public.operations_transfer_settings()
returns table(bank_name text,clabe text,beneficiary text,instructions text)
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not (select private.is_oficia_operations()) then raise exception 'Solo Operaciones puede administrar los datos bancarios'; end if;
  return query select ts.bank_name,ts.clabe,ts.beneficiary,ts.instructions from public.transfer_settings ts where ts.id=1;
end; $$;
revoke all on function public.operations_transfer_settings() from public,anon;
grant execute on function public.operations_transfer_settings() to authenticated;

create or replace function public.operations_update_transfer_settings(
  p_bank_name text,p_clabe text,p_beneficiary text,p_instructions text
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not (select private.is_oficia_operations()) then raise exception 'Solo Operaciones puede actualizar los datos bancarios'; end if;
  if char_length(btrim(coalesce(p_bank_name,''))) not between 2 and 80
    or char_length(btrim(coalesce(p_beneficiary,''))) not between 2 and 120
    or char_length(regexp_replace(coalesce(p_clabe,''),'[[:space:]]','','g'))<>18
    or not private.is_valid_oficia_clabe(regexp_replace(coalesce(p_clabe,''),'[[:space:]]','','g'))
    or char_length(btrim(coalesce(p_instructions,'')))>500 then
    raise exception 'Revisa el banco, beneficiario, CLABE y las indicaciones';
  end if;
  insert into public.transfer_settings(id,bank_name,clabe,beneficiary,instructions,updated_at)
    values(1,btrim(p_bank_name),regexp_replace(p_clabe,'[[:space:]]','','g'),btrim(p_beneficiary),btrim(p_instructions),now())
    on conflict(id) do update set bank_name=excluded.bank_name,clabe=excluded.clabe,
      beneficiary=excluded.beneficiary,instructions=excluded.instructions,updated_at=now();
end; $$;
revoke all on function public.operations_update_transfer_settings(text,text,text,text) from public,anon;
grant execute on function public.operations_update_transfer_settings(text,text,text,text) to authenticated;

create or replace function public.client_report_booking_payment(
  p_booking_id uuid,p_object_path text,p_file_name text,p_mime_type text,p_size_bytes bigint
) returns void language plpgsql security definer set search_path = '' as $$
declare booking_row public.bookings%rowtype; normalized_name text;
begin
  if (select auth.uid()) is null then raise exception 'Inicia sesión para continuar'; end if;
  normalized_name:=left(regexp_replace(btrim(coalesce(p_file_name,'')),'[^A-Za-z0-9._ -]','','g'),160);
  select * into booking_row from public.bookings b where b.id=p_booking_id for update;
  if not found or booking_row.client_id<>(select auth.uid()) or booking_row.status not in ('pendiente','aceptada_anfitrion')
    or booking_row.payment_status not in ('pendiente','rechazado') then raise exception 'Esta solicitud ya no acepta comprobantes'; end if;
  if not exists(select 1 from public.spaces s where s.id=booking_row.space_id and s.is_published and not s.is_demo) then
    raise exception 'El espacio no admite rentas reales'; end if;
  if p_size_bytes not between 1 and 8000000 or p_mime_type not in ('image/jpeg','image/png','application/pdf')
    or char_length(normalized_name)=0 or p_object_path !~ ('^'||p_booking_id::text||'/'||(select auth.uid())::text||'/[^/]+$') then
    raise exception 'El archivo debe ser JPG, PNG o PDF y pesar hasta 8 MB'; end if;
  if not exists(select 1 from storage.objects o where o.bucket_id='oficia-booking-proofs' and o.name=p_object_path) then
    raise exception 'No se encontró el archivo cargado'; end if;
  insert into public.booking_payment_proofs(booking_id,uploaded_by,object_path,file_name,mime_type,size_bytes)
    values(p_booking_id,(select auth.uid()),p_object_path,normalized_name,p_mime_type,p_size_bytes);
  update public.bookings set payment_status='reportado',payment_reported_at=now(),payer_reference=null,intent_expires_at=null
    where id=p_booking_id;
end; $$;
revoke all on function public.client_report_booking_payment(uuid,text,text,text,bigint) from public,anon;
grant execute on function public.client_report_booking_payment(uuid,text,text,text,bigint) to authenticated;

create or replace function public.operations_confirm_booking_payment(p_booking_id uuid,p_note text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare booking_row public.bookings%rowtype; collected_cents integer;
begin
  if (select auth.uid()) is null or not (select private.is_oficia_operations()) then raise exception 'Solo Operaciones puede confirmar pagos'; end if;
  select * into booking_row from public.bookings b where b.id=p_booking_id for update;
  if not found or booking_row.status not in ('pendiente','aceptada_anfitrion') or booking_row.payment_status<>'reportado'
    or not exists(select 1 from public.booking_payment_proofs p where p.booking_id=p_booking_id) then
    raise exception 'Revisa el comprobante antes de confirmar el pago'; end if;
  if not exists(select 1 from public.spaces s where s.id=booking_row.space_id and s.is_published and not s.is_demo) then
    raise exception 'El espacio no admite rentas reales'; end if;
  select coalesce(sum(case when e.direction='cobro_cliente' then e.amount_cents when e.direction='reembolso_cliente' then -e.amount_cents else 0 end),0)::integer
    into collected_cents from public.booking_financial_events e where e.booking_id=p_booking_id;
  if collected_cents<booking_row.total_cents then
    insert into public.booking_financial_events(booking_id,direction,amount_cents,method,external_reference,event_date,note,recorded_by)
    values(p_booking_id,'cobro_cliente',booking_row.total_cents-collected_cents,'transferencia',
      booking_row.transfer_reference,current_date,
      left(coalesce(nullif(btrim(p_note),''),'Pago externo confirmado manualmente por Operaciones.'),500),
      (select auth.uid()));
  end if;
  update public.bookings set payment_status='verificado',payment_reviewed_by=(select auth.uid()),
    payment_reviewed_at=now(),payment_review_note=left(btrim(coalesce(p_note,'')),500),intent_expires_at=null
    where id=p_booking_id;
end; $$;
revoke all on function public.operations_confirm_booking_payment(uuid,text) from public,anon;
grant execute on function public.operations_confirm_booking_payment(uuid,text) to authenticated;

create or replace function public.operations_close_booking_agreement(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare booking_row public.bookings%rowtype;
begin
  if (select auth.uid()) is null or not (select private.is_oficia_operations()) then raise exception 'Solo Operaciones puede cerrar el acuerdo'; end if;
  select * into booking_row from public.bookings b where b.id=p_booking_id for update;
  if not found or booking_row.status not in ('pendiente','aceptada_anfitrion') or booking_row.payment_status<>'verificado' then
    raise exception 'Confirma el pago recibido antes de cerrar el acuerdo'; end if;
  update public.bookings set agreement_closed_at=coalesce(agreement_closed_at,now()),
    agreement_closed_by=coalesce(agreement_closed_by,(select auth.uid())),intent_expires_at=null
    where id=p_booking_id;
end; $$;
revoke all on function public.operations_close_booking_agreement(uuid) from public,anon;
grant execute on function public.operations_close_booking_agreement(uuid) to authenticated;

create or replace function private.operations_decide_booking(p_booking_id uuid,p_decision text,p_reason text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare booking_row public.bookings%rowtype; is_demo_space boolean; customer_net_cents integer;
begin
  if (select auth.uid()) is null or not (select private.is_oficia_operations()) then raise exception 'Solo Operaciones puede revisar solicitudes'; end if;
  if p_decision not in ('confirmar','rechazar') then raise exception 'La decisión no es válida'; end if;
  select b.* into booking_row from public.bookings b where b.id=p_booking_id for update;
  if not found or booking_row.status not in ('pendiente','aceptada_anfitrion') then raise exception 'La solicitud ya no está pendiente'; end if;
  select s.is_demo into is_demo_space from public.spaces s where s.id=booking_row.space_id and s.is_published;
  if not found or coalesce(is_demo_space,true) then raise exception 'Los espacios de muestra no admiten rentas'; end if;
  select coalesce(sum(case when e.direction='cobro_cliente' then e.amount_cents when e.direction='reembolso_cliente' then -e.amount_cents else 0 end),0)::integer
    into customer_net_cents from public.booking_financial_events e where e.booking_id=p_booking_id;
  if p_decision='confirmar' then
    if booking_row.payment_status<>'verificado' or booking_row.agreement_closed_at is null then
      raise exception 'Confirma el pago y cierra el acuerdo antes de autorizar'; end if;
    if customer_net_cents<booking_row.total_cents then raise exception 'El cobro externo debe estar confirmado en la bitácora'; end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(booking_row.space_id,0));
    perform private.assert_booking_availability(booking_row.space_id,booking_row.local_date,booking_row.local_time,booking_row.starts_at,booking_row.ends_at,booking_row.unit,booking_row.id);
    update public.bookings set status='confirmada',rejection_reason=null,operations_reviewed_by=(select auth.uid()),
      operations_reviewed_at=now(),intent_expires_at=null where id=p_booking_id;
  else
    if nullif(btrim(coalesce(p_reason,'')),'') is null then raise exception 'Indica el motivo del rechazo'; end if;
    if customer_net_cents<>0 then raise exception 'Registra primero el reembolso externo antes de rechazar'; end if;
    update public.bookings set status='rechazada',rejection_reason=btrim(p_reason),operations_reviewed_by=(select auth.uid()),
      operations_reviewed_at=now() where id=p_booking_id;
  end if;
end; $$;
revoke all on function private.operations_decide_booking(uuid,text,text) from public,anon,authenticated;
grant execute on function private.operations_decide_booking(uuid,text,text) to authenticated;

create or replace function public.operations_decide_booking(p_booking_id uuid,p_decision text,p_reason text default '')
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.operations_decide_booking(p_booking_id,p_decision,p_reason);
end; $$;
revoke all on function public.operations_decide_booking(uuid,text,text) from public,anon;
grant execute on function public.operations_decide_booking(uuid,text,text) to authenticated;

create or replace function public.notify_booking_oficia() returns trigger
language plpgsql security definer set search_path = '' as $$
declare space_name text; host_user uuid; ops_user uuid;
begin
  select s.name,s.host_id into space_name,host_user from public.spaces s where s.id=new.space_id and not s.is_demo and s.is_published;
  if not found then return new; end if;
  if tg_op='INSERT' then
    perform public.enqueue_oficia_push('booking:'||new.id||':submitted:'||new.client_id,new.client_id,'booking_updates',
      'Solicitud recibida','Operaciones revisará tu solicitud para '||space_name||'.',
      jsonb_build_object('screen','reservations','bookingId',new.id));
    for ops_user in select user_id from private.operations_users loop
      perform public.enqueue_oficia_push('booking:'||new.id||':operations:'||ops_user,ops_user,'booking_updates',
        'Nueva solicitud por revisar','Hay una solicitud para '||space_name||'. Abre el acuerdo en Oficia.',
        jsonb_build_object('screen','operations','bookingId',new.id));
    end loop;
  elsif old.status is distinct from new.status then
    if new.status='aceptada_anfitrion' then
      perform public.enqueue_oficia_push('booking:'||new.id||':host-accepted:'||new.client_id,new.client_id,'booking_updates',
        'Solicitud en revisión','Operaciones continúa con la revisión de '||space_name||'.',
        jsonb_build_object('screen','reservations','bookingId',new.id));
    elsif new.status='confirmada' then
      perform public.enqueue_oficia_push('booking:'||new.id||':confirmed-client:'||new.client_id,new.client_id,'booking_updates',
        'Renta autorizada','Tu renta en '||space_name||' está autorizada. Ya puedes coordinar la entrega.',
        jsonb_build_object('screen','reservations','bookingId',new.id));
      perform public.enqueue_oficia_push('booking:'||new.id||':confirmed-host:'||host_user,host_user,'booking_updates',
        'Renta autorizada','Operaciones autorizó la renta de '||space_name||'. Ya puedes contactar al cliente.',
        jsonb_build_object('screen','owner','bookingId',new.id));
    elsif new.status='rechazada' then
      perform public.enqueue_oficia_push('booking:'||new.id||':rejected:'||new.client_id,new.client_id,'booking_updates',
        'Actualización de solicitud','Revisa el estado de tu solicitud para '||space_name||'.',
        jsonb_build_object('screen','reservations','bookingId',new.id));
    elsif new.status='cancelada' then
      perform public.enqueue_oficia_push('booking:'||new.id||':expired:'||new.client_id,new.client_id,'booking_updates',
        'Solicitud vencida','La solicitud de '||space_name||' venció porque no se recibió el comprobante.',
        jsonb_build_object('screen','reservations','bookingId',new.id));
    end if;
  elsif old.completed_at is null and new.completed_at is not null then
    perform public.enqueue_oficia_push('booking:'||new.id||':review:'||new.client_id,new.client_id,'reviews',
      '¿Cómo estuvo tu espacio?','Deja una opinión sobre '||space_name||'.',
      jsonb_build_object('screen','reviews','spaceId',new.space_id));
    perform public.enqueue_oficia_push('booking:'||new.id||':completed-host:'||host_user,host_user,'booking_updates',
      'Renta finalizada','Ya puedes calificar al cliente de '||space_name||'.',
      jsonb_build_object('screen','owner','bookingId',new.id));
  end if;
  return new;
end; $$;

create or replace function public.notify_booking_payment_progress_oficia() returns trigger
language plpgsql security definer set search_path = '' as $$
declare space_name text; ops_user uuid;
begin
  if old.payment_status is not distinct from new.payment_status then return new; end if;
  select s.name into space_name from public.spaces s where s.id=new.space_id and s.is_published and not s.is_demo;
  if not found then return new; end if;
  if new.payment_status='reportado' then
    for ops_user in select user_id from private.operations_users loop
      perform public.enqueue_oficia_push('booking:'||new.id||':proof:'||ops_user||':'||new.payment_reported_at,ops_user,'booking_updates',
        'Comprobante recibido','Hay un comprobante para revisar en la solicitud '||new.transfer_reference||'.',
        jsonb_build_object('screen','operations','bookingId',new.id));
    end loop;
  elsif new.payment_status='verificado' then
    perform public.enqueue_oficia_push('booking:'||new.id||':payment:verified:'||new.client_id,new.client_id,'booking_updates',
      'Pago confirmado','Operaciones confirmó el pago externo. Falta cerrar el acuerdo y autorizar la renta.',
      jsonb_build_object('screen','reservations','bookingId',new.id));
  elsif new.payment_status='rechazado' then
    perform public.enqueue_oficia_push('booking:'||new.id||':payment:review:'||new.client_id,new.client_id,'booking_updates',
      'Revisa tu comprobante','Operaciones necesita revisar el comprobante de tu solicitud.',
      jsonb_build_object('screen','reservations','bookingId',new.id));
  end if;
  return new;
end; $$;

create or replace function public.notify_booking_message_oficia() returns trigger
language plpgsql security definer set search_path = '' as $$
declare client_user uuid; host_user uuid; space_name text; recipient uuid; booking_status text;
begin
  select b.client_id,s.host_id,s.name,b.status into client_user,host_user,space_name,booking_status
  from public.bookings b join public.spaces s on s.id=b.space_id
  where b.id=new.booking_id and not s.is_demo;
  if not found then return new; end if;
  if booking_status in ('pendiente','aceptada_anfitrion') then
    if new.sender_id=client_user then
      for recipient in select user_id from private.operations_users where user_id<>new.sender_id loop
        perform public.enqueue_oficia_push('booking-message:'||new.id||':'||recipient,recipient,'booking_updates',
          'Mensaje para Operaciones','El cliente escribió sobre '||space_name||'.',
          jsonb_build_object('screen','operations','bookingId',new.booking_id));
      end loop;
    elsif exists(select 1 from private.operations_users o where o.user_id=new.sender_id) then
      perform public.enqueue_oficia_push('booking-message:'||new.id||':'||client_user,client_user,'booking_updates',
        'Mensaje de Operaciones','Tienes una respuesta sobre '||space_name||'.',
        jsonb_build_object('screen','reservations','bookingId',new.booking_id));
    end if;
  elsif booking_status='confirmada' then
    recipient:=case when new.sender_id=host_user then client_user else host_user end;
    perform public.enqueue_oficia_push('booking-message:'||new.id||':'||recipient,recipient,'booking_updates',
      'Nuevo mensaje en Oficia','Tienes un mensaje sobre '||space_name||'.',
      jsonb_build_object('screen','chat','bookingId',new.booking_id));
  end if;
  return new;
end; $$;

create or replace function public.expire_oficia_booking_intents() returns integer
language plpgsql security definer set search_path = '' as $$
declare expired_count integer;
begin
  with expired as (
    update public.bookings b set status='cancelada',rejection_reason='La solicitud venció porque no se recibió el comprobante en 24 horas.',updated_at=now()
    where b.status in ('pendiente','aceptada_anfitrion') and b.payment_status<>'reportado'
      and b.intent_expires_at is not null and b.intent_expires_at<=now()
    returning b.id
  ) select count(*)::integer into expired_count from expired;
  return coalesce(expired_count,0);
end; $$;
revoke all on function public.expire_oficia_booking_intents() from public,anon,authenticated;
grant execute on function public.expire_oficia_booking_intents() to service_role;

do $$
begin
  if to_regprocedure('cron.schedule(text,text,text)') is not null then
    if exists(select 1 from cron.job where jobname='oficia-booking-intent-expiry') then
      perform cron.unschedule((select jobid from cron.job where jobname='oficia-booking-intent-expiry' limit 1));
    end if;
    perform cron.schedule('oficia-booking-intent-expiry','* * * * *','select public.expire_oficia_booking_intents();');
  end if;
end $$;

commit;
