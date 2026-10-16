-- Limit public opinion rows to display fields and keep moderation in RLS.
revoke select on public.space_reviews from anon, authenticated;
grant select (id, space_id, rating, comment, is_published, created_at)
  on public.space_reviews to anon;
grant select (id, space_id, booking_id, rating, comment, is_published, created_at)
  on public.space_reviews to authenticated;

create index if not exists space_reviews_reviewer_idx
  on public.space_reviews (reviewer_id);

drop function if exists public.moderate_space_review(uuid, boolean);
revoke update on public.space_reviews from anon, authenticated;
grant update (is_published) on public.space_reviews to authenticated;
create policy "Solo Operaciones modera opiniones"
  on public.space_reviews for update to authenticated
  using ((select public.is_oficia_operations()))
  with check ((select public.is_oficia_operations()));
