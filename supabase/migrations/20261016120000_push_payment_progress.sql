-- Notify both sides when Operations records a payment-reference review.
-- Oficia does not receive, hold, reconcile, or settle funds; these messages
-- describe only the review status saved in the booking ticket.
create or replace function public.notify_booking_payment_progress_oficia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  space_name text;
  host_user uuid;
  message_title text;
  message_body text;
begin
  if old.payment_status is not distinct from new.payment_status then return new; end if;
  select name, host_id into space_name, host_user
  from public.spaces where id = new.space_id and not is_demo;
  if not found then return new; end if;

  if new.payment_status = 'reportado' then
    message_title := 'Referencia enviada';
    message_body := 'El cliente informó una referencia para ' || space_name || '. Operaciones la revisará.';
  elsif new.payment_status = 'verificado' then
    message_title := 'Referencia revisada';
    message_body := 'Operaciones registró la referencia de ' || space_name || ' como revisada en Oficia. Consulta el ticket para ver el estado.';
  elsif new.payment_status = 'rechazado' then
    message_title := 'Referencia por revisar';
    message_body := 'Operaciones solicitó revisar la referencia del ticket de ' || space_name || '. Consulta el seguimiento.';
  else
    return new;
  end if;

  perform public.enqueue_oficia_push(
    'booking:' || new.id || ':payment:' || new.payment_status || ':client:' || new.client_id,
    new.client_id, 'booking_updates', message_title, message_body,
    jsonb_build_object('screen','reservations','bookingId',new.id,'spaceId',new.space_id)
  );
  perform public.enqueue_oficia_push(
    'booking:' || new.id || ':payment:' || new.payment_status || ':host:' || host_user,
    host_user, 'booking_updates', message_title,
    case when new.payment_status = 'reportado'
      then message_body
      else 'Operaciones actualizó el seguimiento de ' || space_name || '. Consulta la solicitud en Oficia.' end,
    jsonb_build_object('screen','owner','bookingId',new.id,'spaceId',new.space_id)
  );
  return new;
end;
$$;

revoke all on function public.notify_booking_payment_progress_oficia() from public, anon, authenticated;
drop trigger if exists notify_booking_payment_progress_oficia_trigger on public.bookings;
create trigger notify_booking_payment_progress_oficia_trigger
after update of payment_status on public.bookings
for each row execute function public.notify_booking_payment_progress_oficia();
