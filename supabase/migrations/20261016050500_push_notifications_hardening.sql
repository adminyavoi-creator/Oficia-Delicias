-- Explicitly keep outbox access limited to the trusted worker and lock trigger RPCs.
revoke all on function public.notify_booking_oficia() from public, anon, authenticated;
revoke all on function public.notify_review_oficia() from public, anon, authenticated;
revoke all on function public.notify_space_draft_oficia() from public, anon, authenticated;

create policy "Worker only push outbox" on public.push_outbox
  for all to service_role using (true) with check (true);
grant select, insert, update on public.push_outbox to service_role;
grant select, insert, update on public.notification_inbox, public.push_devices,
  public.notification_preferences, public.notification_campaigns,
  public.oficia_profiles, public.bookings, public.spaces to service_role;

create index if not exists notification_campaigns_created_by_idx on public.notification_campaigns(created_by);
create index if not exists push_outbox_user_id_idx on public.push_outbox(user_id);
