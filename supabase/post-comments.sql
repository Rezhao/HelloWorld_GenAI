-- Run after community-privacy.sql in the Supabase SQL editor.
begin;
create table if not exists public.generation_comments (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.ai_generations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000 and body ~ '[^[:space:]]'),
  created_at timestamptz not null default now()
);
create index if not exists generation_comments_thread_idx on public.generation_comments(generation_id, created_at, id);
alter table public.generation_comments enable row level security;

drop policy if exists "Read comments on visible posts" on public.generation_comments;
create policy "Read comments on visible posts" on public.generation_comments
for select to authenticated using (public.can_read_generation(generation_id));
drop policy if exists "Comment on visible posts" on public.generation_comments;
create policy "Comment on visible posts" on public.generation_comments
for insert to authenticated with check (user_id = auth.uid() and public.can_read_generation(generation_id));
drop policy if exists "Delete own comments" on public.generation_comments;
create policy "Delete own comments" on public.generation_comments
for delete to authenticated using (user_id = auth.uid() and public.can_read_generation(generation_id));
revoke all on public.generation_comments from public, anon, authenticated;
grant select, insert, delete on public.generation_comments to authenticated;
commit;
