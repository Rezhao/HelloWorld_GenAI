-- Run in Melon's existing Supabase SQL Editor after the community/privacy/comments/appearance migrations.
-- Keep RLS enabled. Guests receive only explicitly public content via bounded read-only functions.
begin;
create index if not exists public_media_path_lookup on public.ai_generations(image_path);
create or replace function public.public_community_directory() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(r order by r.name,r.id),'[]') from (
  select id,name,description,visibility,created_by,created_at,avatar_path,banner_path,false as is_member
  from public.communities where visibility='public'
 ) r;
$$;
create or replace function public.public_community_posts(target_community uuid default null,target_post uuid default null) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(r order by r.created_at desc,r.id),'[]') from (
  select g.id,g.user_id,g.image_path,g.prompt,g.caption,g.created_at,g.community_id,
   coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),'Community member') as author_name,p.avatar_url as author_avatar_url,
   (select count(*) from public.generation_votes v where v.generation_id=g.id and v.vote=1) as likes_count,0 as user_vote
  from public.ai_generations g join public.communities c on c.id=g.community_id and c.visibility='public'
  left join lateral (select first_name,last_name,avatar_url from public.profiles where id=g.user_id limit 1) p on true
  where (target_community is null or g.community_id=target_community) and (target_post is null or g.id=target_post)
  order by g.created_at desc,g.id limit 500
 ) r;
$$;
create or replace function public.public_post_comments(target_post uuid,page_number integer default 1) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare records jsonb; total bigint;
begin
 if page_number is null or page_number not between 1 and 100000 then raise exception 'Invalid comment page'; end if;
 if not exists(select 1 from public.ai_generations g join public.communities c on c.id=g.community_id where g.id=target_post and c.visibility='public') then
  return jsonb_build_object('items','[]'::jsonb,'total',0);
 end if;
 select count(*) into total from public.generation_comments where generation_id=target_post;
 select coalesce(jsonb_agg(r order by r.created_at desc,r.id),'[]') into records from (
  select m.id,m.user_id,m.body,m.created_at,
   coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),'Community member') as author_name,p.avatar_url as author_avatar_url
  from public.generation_comments m left join lateral (select first_name,last_name,avatar_url from public.profiles where id=m.user_id limit 1) p on true
  where m.generation_id=target_post order by m.created_at desc,m.id limit 50 offset (page_number-1)*50
 ) r;
 return jsonb_build_object('items',records,'total',total);
end $$;
-- A path is previewable only when attached to a public post. Shared paths referenced
-- by private/unassigned posts are conservatively withheld from anonymous previews.
create or replace function public.public_can_preview_media(object_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.ai_generations g join public.communities c on c.id=g.community_id where g.image_path=object_path and c.visibility='public')
 and not exists(select 1 from public.ai_generations g left join public.communities c on c.id=g.community_id where g.image_path=object_path and c.visibility is distinct from 'public');
$$;
revoke all on function public.public_community_directory(),public.public_community_posts(uuid,uuid),public.public_post_comments(uuid,integer),public.public_can_preview_media(text) from public,anon,authenticated;
grant execute on function public.public_community_directory(),public.public_community_posts(uuid,uuid),public.public_post_comments(uuid,integer),public.public_can_preview_media(text) to anon,authenticated;
-- Do not expose profiles, voter identities, memberships or raw private post tables.
revoke all on public.profile_cards from public,anon;
drop policy if exists "Guest public community metadata" on public.communities;
create policy "Guest public community metadata" on public.communities as restrictive for select to anon using(visibility='public');
do $$ declare t text; begin
 foreach t in array array['profiles','community_members','community_join_requests','generation_comments'] loop
  execute format('drop policy if exists "Guest private records hidden" on public.%I',t);
  execute format('create policy "Guest private records hidden" on public.%I as restrictive for select to anon using(false)',t);
 end loop;
 foreach t in array array['profiles','communities','community_members','community_join_requests','ai_generations','generation_votes','generation_comments'] loop
  execute format('revoke insert,update,delete on public.%I from anon',t);
  execute format('drop policy if exists "Guest cannot insert" on public.%I',t);
  execute format('create policy "Guest cannot insert" on public.%I as restrictive for insert to anon with check(false)',t);
  execute format('drop policy if exists "Guest cannot update" on public.%I',t);
  execute format('create policy "Guest cannot update" on public.%I as restrictive for update to anon using(false) with check(false)',t);
  execute format('drop policy if exists "Guest cannot delete" on public.%I',t);
  execute format('create policy "Guest cannot delete" on public.%I as restrictive for delete to anon using(false)',t);
 end loop;
end $$;
update storage.buckets set public=false where id='generated-media';
drop policy if exists "No anonymous generated media" on storage.objects;
create policy "No anonymous generated media" on storage.objects as restrictive for select to anon using(bucket_id<>'generated-media' or public.public_can_preview_media(name));
drop policy if exists "Guest public post previews" on storage.objects;
create policy "Guest public post previews" on storage.objects for select to anon using(bucket_id='generated-media' and public.public_can_preview_media(name));
-- Existing private library/Studio storage boundaries remain in place.
drop policy if exists "Guest cannot upload generated media" on storage.objects;
create policy "Guest cannot upload generated media" on storage.objects as restrictive for insert to anon with check(bucket_id<>'generated-media');
drop policy if exists "Guest cannot change generated media" on storage.objects;
create policy "Guest cannot change generated media" on storage.objects as restrictive for update to anon using(bucket_id<>'generated-media') with check(bucket_id<>'generated-media');
drop policy if exists "Guest cannot delete generated media" on storage.objects;
create policy "Guest cannot delete generated media" on storage.objects as restrictive for delete to anon using(bucket_id<>'generated-media');
notify pgrst,'reload schema';
commit;
