-- Owner request, Operations authorization, and chat notifications use the
-- existing inbox + FCM outbox pipeline, with dedupe keys per state/message.
create or replace function public.notify_booking_oficia() returns trigger
language plpgsql security definer set search_path = '' as $$
declare space_name text; host_user uuid;
begin
  select name,host_id into space_name,host_user from public.spaces where id=new.space_id and not is_demo;
  if not found then return new; end if;
  if tg_op='INSERT' then
    perform public.enqueue_oficia_push('booking:'||new.id||':submitted:'||new.client_id,new.client_id,'booking_updates','Solicitud enviada','Tu solicitud para '||space_name||' quedó registrada.',jsonb_build_object('screen','reservations','bookingId',new.id));
    perform public.enqueue_oficia_push('booking:'||new.id||':new-host:'||host_user,host_user,'booking_updates','Nueva solicitud','Tienes una solicitud para '||space_name||'.',jsonb_build_object('screen','owner','bookingId',new.id));
  elsif old.status is distinct from new.status then
    if new.status='aceptada_anfitrion' then
      perform public.enqueue_oficia_push('booking:'||new.id||':host-accepted:'||new.client_id,new.client_id,'booking_updates','El anfitrión aceptó','Falta la validación final de Operaciones para '||space_name||'.',jsonb_build_object('screen','reservations','bookingId',new.id));
    elsif new.status='confirmada' then
      perform public.enqueue_oficia_push('booking:'||new.id||':confirmed-client:'||new.client_id,new.client_id,'booking_updates','Renta autorizada','Tu renta en '||space_name||' ya está autorizada. Consulta tu ticket y el chat.',jsonb_build_object('screen','reservations','bookingId',new.id));
      perform public.enqueue_oficia_push('booking:'||new.id||':confirmed-host:'||host_user,host_user,'booking_updates','Renta autorizada','Operaciones autorizó la renta de '||space_name||'. Ya puedes contactar al cliente.',jsonb_build_object('screen','owner','bookingId',new.id));
    elsif new.status='rechazada' then
      perform public.enqueue_oficia_push('booking:'||new.id||':rejected:'||new.client_id,new.client_id,'booking_updates','Actualización de solicitud','Revisa el estado de tu solicitud para '||space_name||'.',jsonb_build_object('screen','reservations','bookingId',new.id));
    end if;
  elsif old.completed_at is null and new.completed_at is not null then
    perform public.enqueue_oficia_push('booking:'||new.id||':review:'||new.client_id,new.client_id,'reviews','¿Cómo estuvo tu espacio?','Deja una opinión sobre '||space_name||'.',jsonb_build_object('screen','reviews','spaceId',new.space_id));
    perform public.enqueue_oficia_push('booking:'||new.id||':completed-host:'||host_user,host_user,'booking_updates','Renta finalizada','Ya puedes calificar al cliente de '||space_name||'.',jsonb_build_object('screen','owner','bookingId',new.id));
  end if;
  return new;
end; $$;

