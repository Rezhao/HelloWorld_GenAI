-- Run in the existing Melon Supabase SQL editor after community-privacy.sql.
-- Decorative community/profile photos are public, like community names and
-- avatars. Private-community posts and generated media remain private.
begin;
alter table public.communities add column if not exists avatar_path text, add column if not exists banner_path text;
alter table public.profiles add column if not exists banner_path text;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('appearance-images', 'appearance-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

create or replace function public.can_manage_appearance(object_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and object_path not like '%..%'
    and split_part(object_path, '/', 4) <> '' and split_part(object_path, '/', 5) = ''
    and (
      (split_part(object_path, '/', 1) = 'profiles' and split_part(object_path, '/', 2) = auth.uid()::text
        and split_part(object_path, '/', 3) = 'banner')
      or (split_part(object_path, '/', 1) = 'communities' and split_part(object_path, '/', 3) in ('avatar','banner')
        and exists(select 1 from public.communities c where c.id::text = split_part(object_path, '/', 2) and c.created_by = auth.uid()))
    );
$$;

drop policy if exists "Read appearance images" on storage.objects;
create policy "Read appearance images" on storage.objects for select to anon, authenticated using(bucket_id = 'appearance-images');
drop policy if exists "Upload owned appearance images" on storage.objects;
create policy "Upload owned appearance images" on storage.objects for insert to authenticated
with check(bucket_id = 'appearance-images' and public.can_manage_appearance(name));
drop policy if exists "Remove owned appearance images" on storage.objects;
create policy "Remove owned appearance images" on storage.objects for delete to authenticated
using(bucket_id = 'appearance-images' and public.can_manage_appearance(name));

-- Restrictive policies also constrain any legacy permissive storage policies.
drop policy if exists "Appearance upload ownership" on storage.objects;
create policy "Appearance upload ownership" on storage.objects as restrictive for insert to authenticated
with check(bucket_id <> 'appearance-images' or public.can_manage_appearance(name));
drop policy if exists "Appearance delete ownership" on storage.objects;
create policy "Appearance delete ownership" on storage.objects as restrictive for delete to authenticated
using(bucket_id <> 'appearance-images' or public.can_manage_appearance(name));
drop policy if exists "Immutable appearance objects" on storage.objects;
create policy "Immutable appearance objects" on storage.objects as restrictive for update to authenticated
using(bucket_id <> 'appearance-images') with check(bucket_id <> 'appearance-images');
drop policy if exists "No anonymous appearance uploads" on storage.objects;
create policy "No anonymous appearance uploads" on storage.objects as restrictive for insert to anon with check(bucket_id <> 'appearance-images');
drop policy if exists "No anonymous appearance updates" on storage.objects;
create policy "No anonymous appearance updates" on storage.objects as restrictive for update to anon
using(bucket_id <> 'appearance-images') with check(bucket_id <> 'appearance-images');
drop policy if exists "No anonymous appearance deletes" on storage.objects;
create policy "No anonymous appearance deletes" on storage.objects as restrictive for delete to anon using(bucket_id <> 'appearance-images');

create or replace function public.set_community_image(target uuid, image_kind text, new_path text)
returns text language plpgsql security definer set search_path = '' as $$
declare community_owner uuid; old_avatar text; old_banner text; previous_path text;
begin
  if auth.uid() is null then raise exception 'Sign in to change community photos' using errcode = '42501'; end if;
  if image_kind not in ('avatar','banner') or image_kind is null then raise exception 'Invalid photo type'; end if;
  select created_by, avatar_path, banner_path into community_owner, old_avatar, old_banner
    from public.communities where id = target for update;
  if not found or community_owner <> auth.uid() then raise exception 'Only the community owner can change photos' using errcode = '42501'; end if;
  if new_path is not null and (
    not public.can_manage_appearance(new_path)
    or split_part(new_path, '/', 1) <> 'communities' or split_part(new_path, '/', 2) <> target::text
    or split_part(new_path, '/', 3) <> image_kind
    or not exists(select 1 from storage.objects where bucket_id = 'appearance-images' and name = new_path)
  ) then raise exception 'Upload a photo for this community first'; end if;
  previous_path := case when image_kind = 'avatar' then old_avatar else old_banner end;
  if image_kind = 'avatar' then update public.communities set avatar_path = new_path where id = target;
  else update public.communities set banner_path = new_path where id = target; end if;
  return previous_path;
end;
$$;

create or replace function public.set_profile_banner(new_path text)
returns text language plpgsql security definer set search_path = '' as $$
declare previous_path text;
begin
  if auth.uid() is null then raise exception 'Sign in to change your background' using errcode = '42501'; end if;
  if new_path is not null and (
    not public.can_manage_appearance(new_path) or split_part(new_path, '/', 1) <> 'profiles'
    or not exists(select 1 from storage.objects where bucket_id = 'appearance-images' and name = new_path)
  ) then raise exception 'Upload your background first'; end if;
  select banner_path into previous_path from public.profiles where id = auth.uid() limit 1 for update;
  -- Do not assume a unique id constraint: the existing profiles table has none.
  if not found then
    insert into public.profiles(id, email, banner_path) select id, email, new_path from auth.users where id = auth.uid();
  else update public.profiles set banner_path = new_path where id = auth.uid(); end if;
  return previous_path;
end;
$$;

revoke all on function public.can_manage_appearance(text), public.set_community_image(uuid,text,text), public.set_profile_banner(text) from public, anon, authenticated;
grant execute on function public.can_manage_appearance(text), public.set_community_image(uuid,text,text), public.set_profile_banner(text) to authenticated;
commit;
