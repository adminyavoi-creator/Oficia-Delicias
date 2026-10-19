-- A booking insert invokes this private availability helper from its trigger.
-- Grant only this precise signature to authenticated sessions; the function
-- remains in the non-exposed private schema and revalidates the slot server-side.
grant execute on function private.assert_booking_availability(
  text,
  date,
  time without time zone,
  timestamp with time zone,
  timestamp with time zone,
  text,
  uuid
) to authenticated;
