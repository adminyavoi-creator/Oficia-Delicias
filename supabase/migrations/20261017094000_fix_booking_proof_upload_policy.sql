-- Idempotent alignment with the verified private proof-upload policy.
drop policy if exists "Cliente carga comprobante de renta" on storage.objects;
create policy "Cliente carga comprobante de renta"
  on storage.objects for insert to authenticated
  with check (
    bucket_id='oficia-booking-proofs'
    and (storage.foldername(storage.objects.name))[2]=(select auth.uid())::text
    and exists (
      select 1 from public.bookings b join public.spaces s on s.id=b.space_id
      where b.id::text=(storage.foldername(storage.objects.name))[1]
        and b.client_id=(select auth.uid())
        and not s.is_demo and b.status in ('pendiente','aceptada_anfitrion')
        and (b.intent_expires_at is null or b.intent_expires_at>now() or b.payment_status='reportado')
    )
  );
