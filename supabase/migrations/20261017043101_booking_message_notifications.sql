create or replace function public.notify_booking_message_oficia() returns trigger
language plpgsql security definer set search_path = '' as $$
declare recipient uuid; client_user uuid; host_user uuid; space_name text;
begin
  select b.client_id,s.host_id,s.name into client_user,host_user,space_name
  from public.bookings b join public.spaces s on s.id=b.space_id
  where b.id=new.booking_id and b.status='confirmada' and not s.is_demo;
  if not found then return new; end if;
  recipient := case when new.sender_id=host_user then client_user else host_user end;
  perform public.enqueue_oficia_push('booking-message:'||new.id||':'||recipient,recipient,'booking_updates','Nuevo mensaje en Oficia','Tienes un mensaje sobre '||space_name||'.',jsonb_build_object('screen','chat','bookingId',new.booking_id));
  return new;
end; $$;
revoke all on function public.notify_booking_message_oficia() from public,anon,authenticated;
drop trigger if exists notify_booking_message_oficia_trigger on public.booking_messages;
create trigger notify_booking_message_oficia_trigger after insert on public.booking_messages for each row execute function public.notify_booking_message_oficia();

-- Enable Supabase Realtime for app-open updates; RLS still controls rows.
