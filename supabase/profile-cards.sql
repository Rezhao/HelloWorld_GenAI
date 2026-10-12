-- Expose only fields needed to identify post authors. Email and other profile
-- fields remain protected by the profiles table's RLS policy.
create or replace view public.profile_cards
with (security_invoker = false)
as
select id, first_name, last_name, avatar_url
from public.profiles;

grant select on public.profile_cards to authenticated;
revoke all on public.profile_cards from anon;

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles
	for insert to authenticated with check (id = auth.uid());