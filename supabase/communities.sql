create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 50),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

alter table public.ai_generations add column if not exists community_id uuid references public.communities(id) on delete set null;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;

drop policy if exists "Authenticated users can read communities" on public.communities;
create policy "Authenticated users can read communities" on public.communities
  for select to authenticated using (true);
drop policy if exists "Users can create communities" on public.communities;
create policy "Users can create communities" on public.communities
  for insert to authenticated with check (created_by = auth.uid());

drop policy if exists "Authenticated users can read community members" on public.community_members;
create policy "Authenticated users can read community members" on public.community_members
  for select to authenticated using (true);
drop policy if exists "Users can join communities" on public.community_members;
create policy "Users can join communities" on public.community_members
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Users can post to communities they joined" on public.ai_generations;
create policy "Users can post to communities they joined" on public.ai_generations
  for insert to authenticated
  with check (
    community_id is null
    or exists (
      select 1 from public.community_members
      where community_id = ai_generations.community_id and user_id = auth.uid()
    )
  );

-- Create the default community and move older public-feed posts into it.
insert into public.communities (name, created_by)
select 'random', id
from auth.users
order by created_at
limit 1
on conflict (name) do nothing;

update public.ai_generations
set community_id = (select id from public.communities where name = 'random')
where community_id is null
  and exists (select 1 from public.communities where name = 'random');