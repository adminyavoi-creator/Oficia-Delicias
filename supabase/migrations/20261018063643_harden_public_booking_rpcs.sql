-- Keep privileged booking operations outside the exposed public API schema.
-- Public RPC names and signatures remain stable for the PWA and Android app.

grant usage on schema private to authenticated;

alter function public.booking_payment_instructions(uuid) set schema private;
alter function public.operations_transfer_settings() set schema private;
alter function public.operations_update_transfer_settings(text,text,text,text) set schema private;
alter function public.client_report_booking_payment(uuid,text,text,text,bigint) set schema private;
alter function public.operations_confirm_booking_payment(uuid,text) set schema private;
alter function public.operations_close_booking_agreement(uuid) set schema private;
alter function public.operations_reject_booking_proof(uuid,text) set schema private;

revoke all on function private.booking_payment_instructions(uuid) from public, anon, authenticated;
revoke all on function private.operations_transfer_settings() from public, anon, authenticated;
revoke all on function private.operations_update_transfer_settings(text,text,text,text) from public, anon, authenticated;
revoke all on function private.client_report_booking_payment(uuid,text,text,text,bigint) from public, anon, authenticated;
revoke all on function private.operations_confirm_booking_payment(uuid,text) from public, anon, authenticated;
revoke all on function private.operations_close_booking_agreement(uuid) from public, anon, authenticated;
revoke all on function private.operations_reject_booking_proof(uuid,text) from public, anon, authenticated;

grant execute on function private.booking_payment_instructions(uuid) to authenticated;
grant execute on function private.operations_transfer_settings() to authenticated;
grant execute on function private.operations_update_transfer_settings(text,text,text,text) to authenticated;
grant execute on function private.client_report_booking_payment(uuid,text,text,text,bigint) to authenticated;
grant execute on function private.operations_confirm_booking_payment(uuid,text) to authenticated;
grant execute on function private.operations_close_booking_agreement(uuid) to authenticated;
grant execute on function private.operations_reject_booking_proof(uuid,text) to authenticated;

create or replace function public.booking_customer_contact(p_booking_id uuid)
returns table(display_name text,email text,phone text,avatar_url text)
language sql security invoker set search_path = '' as $$
  select * from private.booking_customer_contact(p_booking_id);
$$;
revoke all on function public.booking_customer_contact(uuid) from public,anon;
grant execute on function public.booking_customer_contact(uuid) to authenticated;

create or replace function public.booking_payment_instructions(p_booking_id uuid)
returns table(bank_name text,clabe text,beneficiary text,instructions text,transfer_reference text,total_cents integer)
language sql security invoker set search_path = '' as $$
  select * from private.booking_payment_instructions(p_booking_id);
$$;
revoke all on function public.booking_payment_instructions(uuid) from public,anon;
grant execute on function public.booking_payment_instructions(uuid) to authenticated;

create or replace function public.operations_transfer_settings()
returns table(bank_name text,clabe text,beneficiary text,instructions text)
language sql security invoker set search_path = '' as $$
  select * from private.operations_transfer_settings();
$$;
revoke all on function public.operations_transfer_settings() from public,anon;
grant execute on function public.operations_transfer_settings() to authenticated;

create or replace function public.operations_update_transfer_settings(
  p_bank_name text,p_clabe text,p_beneficiary text,p_instructions text
) returns void language sql security invoker set search_path = '' as $$
  select private.operations_update_transfer_settings(p_bank_name,p_clabe,p_beneficiary,p_instructions);
$$;
revoke all on function public.operations_update_transfer_settings(text,text,text,text) from public,anon;
grant execute on function public.operations_update_transfer_settings(text,text,text,text) to authenticated;

create or replace function public.client_report_booking_payment(
  p_booking_id uuid,p_object_path text,p_file_name text,p_mime_type text,p_size_bytes bigint
) returns void language sql security invoker set search_path = '' as $$
  select private.client_report_booking_payment(p_booking_id,p_object_path,p_file_name,p_mime_type,p_size_bytes);
$$;
revoke all on function public.client_report_booking_payment(uuid,text,text,text,bigint) from public,anon;
grant execute on function public.client_report_booking_payment(uuid,text,text,text,bigint) to authenticated;

create or replace function public.operations_confirm_booking_payment(p_booking_id uuid,p_note text default '')
returns void language sql security invoker set search_path = '' as $$
  select private.operations_confirm_booking_payment(p_booking_id,p_note);
$$;
revoke all on function public.operations_confirm_booking_payment(uuid,text) from public,anon;
grant execute on function public.operations_confirm_booking_payment(uuid,text) to authenticated;

create or replace function public.operations_close_booking_agreement(p_booking_id uuid)
returns void language sql security invoker set search_path = '' as $$
  select private.operations_close_booking_agreement(p_booking_id);
$$;
revoke all on function public.operations_close_booking_agreement(uuid) from public,anon;
grant execute on function public.operations_close_booking_agreement(uuid) to authenticated;

create or replace function public.operations_reject_booking_proof(p_booking_id uuid,p_reason text)
returns void language sql security invoker set search_path = '' as $$
  select private.operations_reject_booking_proof(p_booking_id,p_reason);
$$;
revoke all on function public.operations_reject_booking_proof(uuid,text) from public,anon;
grant execute on function public.operations_reject_booking_proof(uuid,text) to authenticated;

create or replace function public.operations_decide_booking(p_booking_id uuid,p_decision text,p_reason text default '')
returns void language sql security invoker set search_path = '' as $$
  select private.operations_decide_booking(p_booking_id,p_decision,p_reason);
$$;
revoke all on function public.operations_decide_booking(uuid,text,text) from public,anon;
grant execute on function public.operations_decide_booking(uuid,text,text) to authenticated;
