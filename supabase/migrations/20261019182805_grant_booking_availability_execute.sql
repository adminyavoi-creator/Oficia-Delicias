-- Historical migration record kept in sync with the production database.
-- The exact signature is repeated in the subsequent migration because the
-- shorthand time type did not resolve to the deployed function signature.
grant execute on function private.assert_booking_availability(text, date, time, timestamptz, timestamptz, text, uuid) to authenticated;
