create or replace function public.operations_reject_booking_proof(p_booking_id uuid,p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare booking_row public.bookings%rowtype; reason_text text;
begin
  if (select auth.uid()) is null or not (select private.is_oficia_operations()) then
    raise exception 'Solo Operaciones puede revisar comprobantes';
  end if;
  reason_text:=left(btrim(coalesce(p_reason,'')),500);
  if char_length(reason_text)<4 then raise exception 'Indica qué debe corregir el cliente'; end if;
  select * into booking_row from public.bookings b where b.id=p_booking_id for update;
  if not found or booking_row.status not in ('pendiente','aceptada_anfitrion') or booking_row.payment_status<>'reportado' then
    raise exception 'No hay un comprobante pendiente de revisión';
  end if;
  if not exists(select 1 from public.booking_payment_proofs p where p.booking_id=p_booking_id and p.uploaded_by=booking_row.client_id) then
    raise exception 'No se encontró el comprobante del cliente';
  end if;
  update public.bookings set payment_status='rechazado',payment_reviewed_by=(select auth.uid()),
    payment_reviewed_at=now(),payment_review_note=reason_text,intent_expires_at=now()+interval '24 hours'
  where id=p_booking_id;
end; $$;
revoke all on function public.operations_reject_booking_proof(uuid,text) from public,anon;
grant execute on function public.operations_reject_booking_proof(uuid,text) to authenticated;
