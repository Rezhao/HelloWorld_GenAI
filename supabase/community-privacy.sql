-- Run after communities.sql and profile-cards.sql in the Supabase SQL editor.
begin;

alter table public.communities
  add column if not exists description text not null default '' check (char_length(description) <= 500),
  add column if not exists visibility text not null default 'public' check (visibility in ('public', 'private'));

create table if not exists public.community_join_requests (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  primary key (community_id, user_id)
);
alter table public.community_join_requests enable row level security;

-- These helpers avoid recursive RLS checks and always check the current caller.
create or replace function public.owns_community(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.communities where id = target and created_by = auth.uid());
$$;
create or replace function public.belongs_to_community(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.owns_community(target) or exists (
    select 1 from public.community_members where community_id = target and user_id = auth.uid()
  );
$$;
create or replace function public.can_read_community(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.communities where id = target
    and (visibility = 'public' or public.belongs_to_community(target)));
$$;
create or replace function public.can_read_generation(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.ai_generations where id = target
    and (community_id is null or public.can_read_community(community_id)));
$$;

create or replace function public.add_community_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.community_members(community_id, user_id) values(new.id, new.created_by)
  on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists community_owner_membership on public.communities;
create trigger community_owner_membership after insert on public.communities
for each row execute function public.add_community_owner();
insert into public.community_members(community_id, user_id)
select id, created_by from public.communities on conflict do nothing;

-- Restrictive policies also constrain permissive policies from earlier setup.
drop policy if exists "Community membership approval required" on public.community_members;
create policy "Community membership approval required" on public.community_members
as restrictive for insert to authenticated with check (
  user_id = auth.uid() and exists (
    select 1 from public.communities where id = community_id and visibility = 'public'
  )
);
drop policy if exists "Membership changes require owner approval" on public.community_members;
create policy "Membership changes require owner approval" on public.community_members
as restrictive for update to authenticated using (false) with check (false);
drop policy if exists "Memberships visible to community readers" on public.community_members;
create policy "Memberships visible to community readers" on public.community_members
as restrictive for select to authenticated using (public.can_read_community(community_id) or user_id = auth.uid());

-- A request never grants membership by itself. Only the owner RPC can approve it.
drop policy if exists "Read own or owned community requests" on public.community_join_requests;
create policy "Read own or owned community requests" on public.community_join_requests
for select to authenticated using (user_id = auth.uid() or public.owns_community(community_id));
drop policy if exists "Request private community membership" on public.community_join_requests;
create policy "Request private community membership" on public.community_join_requests
for insert to authenticated with check (
  user_id = auth.uid() and status = 'pending' and not public.belongs_to_community(community_id)
  and exists(select 1 from public.communities where id = community_id and visibility = 'private')
);

create or replace function public.review_community_request(target_community uuid, target_user uuid, approve boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.owns_community(target_community) then
    raise exception 'Only the community owner can review requests.';
  end if;
  perform 1 from public.community_join_requests
    where community_id = target_community and user_id = target_user and status = 'pending' for update;
  if not found then raise exception 'This request has already been reviewed or does not exist.'; end if;
  if approve then
    insert into public.community_members(community_id, user_id) values(target_community, target_user)
    on conflict do nothing;
  end if;
  update public.community_join_requests set status = case when approve then 'approved' else 'rejected' end
    where community_id = target_community and user_id = target_user;
end;
$$;

alter table public.ai_generations enable row level security;
drop policy if exists "Read accessible community posts" on public.ai_generations;
create policy "Read accessible community posts" on public.ai_generations
for select to authenticated using (true);
drop policy if exists "Private community post visibility" on public.ai_generations;
create policy "Private community post visibility" on public.ai_generations
as restrictive for select to authenticated using (community_id is null or public.can_read_community(community_id));
drop policy if exists "Community post membership required" on public.ai_generations;
create policy "Community post membership required" on public.ai_generations
as restrictive for insert to authenticated with check (
  user_id = auth.uid() and (community_id is null or public.belongs_to_community(community_id))
);
drop policy if exists "Community post updates require membership" on public.ai_generations;
create policy "Community post updates require membership" on public.ai_generations
as restrictive for update to authenticated
using (user_id = auth.uid() and (community_id is null or public.belongs_to_community(community_id)))
with check (user_id = auth.uid() and (community_id is null or public.belongs_to_community(community_id)));

alter table public.generation_votes enable row level security;
drop policy if exists "Votes require visible posts" on public.generation_votes;
create policy "Votes require visible posts" on public.generation_votes
as restrictive for all to authenticated
using (public.can_read_generation(generation_id)) with check (public.can_read_generation(generation_id));

-- Keep media private even when someone knows an image's storage path.
update storage.buckets set public = false where id = 'generated-media';
drop policy if exists "Community media visibility" on storage.objects;
create policy "Community media visibility" on storage.objects
as restrictive for select to authenticated using (
  bucket_id <> 'generated-media' or (storage.foldername(name))[1] = auth.uid()::text
  or exists(select 1 from public.ai_generations where image_path = name and public.can_read_generation(id))
);
-- Prevent legacy anonymous policies from bypassing private community access.
drop policy if exists "No anonymous community posts" on public.ai_generations;
create policy "No anonymous community posts" on public.ai_generations as restrictive for select to anon using (false);
drop policy if exists "No anonymous community votes" on public.generation_votes;
create policy "No anonymous community votes" on public.generation_votes as restrictive for select to anon using (false);
drop policy if exists "No anonymous generated media" on storage.objects;
create policy "No anonymous generated media" on storage.objects as restrictive for select to anon using (bucket_id <> 'generated-media');

revoke all on function public.owns_community(uuid), public.belongs_to_community(uuid),
  public.can_read_community(uuid), public.can_read_generation(uuid),
  public.review_community_request(uuid, uuid, boolean), public.add_community_owner() from public, anon;
grant execute on function public.owns_community(uuid), public.belongs_to_community(uuid),
  public.can_read_community(uuid), public.can_read_generation(uuid),
  public.review_community_request(uuid, uuid, boolean) to authenticated;
grant select, insert on public.community_join_requests to authenticated;
commit;
