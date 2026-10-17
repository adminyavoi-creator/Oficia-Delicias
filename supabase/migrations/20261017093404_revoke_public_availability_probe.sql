-- La app consulta disponibilidad mediante el catálogo y la solicitud vuelve a validarse
-- en el servidor. No se expone la función de diagnóstico a usuarios del cliente.
revoke all on function public.assert_booking_availability(text,date,time,timestamptz,timestamptz,text)
  from public, anon, authenticated;
