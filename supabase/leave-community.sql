-- Run in Melon's Supabase SQL Editor, keeping RLS enabled.
begin;
create or replace function public.leave_community(target_community uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid(); owner_id uuid;
begin
  if caller is null then raise exception 'Sign in to leave a community.'; end if;
  select created_by into owner_id from public.communities where id=target_community for update;
  if not found then raise exception 'Community not found.'; end if;
  if owner_id=caller then raise exception 'Community owners cannot leave their own community.'; end if;
  -- Match the approval function's request-row lock before changing membership.
  perform 1 from public.community_join_requests where community_id=target_community and user_id=caller for update;
  delete from public.community_members where community_id=target_community and user_id=caller;
  -- Remove the old approval so rejoining a private community needs a fresh request.
  delete from public.community_join_requests where community_id=target_community and user_id=caller;
end;
$$;
revoke all on function public.leave_community(uuid) from public,anon,authenticated;
grant execute on function public.leave_community(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
