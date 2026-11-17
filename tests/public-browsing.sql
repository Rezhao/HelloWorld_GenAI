-- Disposable local database only, after the main migrations and public-browsing.sql.
begin;
insert into auth.users(id) values ('10000000-0000-0000-0000-000000000001');
insert into public.profiles(id,email,first_name) values ('10000000-0000-0000-0000-000000000001','secret@example.com','Public author');
insert into public.communities(id,name,visibility,created_by) values
 ('20000000-0000-0000-0000-000000000001','Public test','public','10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000002','Private test','private','10000000-0000-0000-0000-000000000001');
insert into public.ai_generations(id,user_id,community_id,image_path,prompt,caption) values
 ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','public.jpg','public prompt','public caption'),
 ('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','private.jpg','private prompt','private caption'),
 ('30000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001',null,'orphan.jpg','unassigned prompt','unassigned caption');
insert into public.generation_comments(generation_id,user_id,body) values
 ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Public comment'),
 ('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Private comment');
insert into public.generation_votes(generation_id,user_id,vote) values ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',1);
insert into storage.objects(bucket_id,name) values ('generated-media','public.jpg'),('generated-media','private.jpg'),('generated-media','orphan.jpg');
-- Simulate legacy permissive policies/grants: restrictive guards must still win.
grant select,insert,update,delete on all tables in schema public,storage to anon;
create policy legacy_guest on public.ai_generations for all to anon using(true) with check(true);
create policy legacy_guest on public.generation_votes for all to anon using(true) with check(true);
create policy legacy_guest on public.community_members for all to anon using(true) with check(true);
create policy legacy_guest on storage.objects for all to anon using(true) with check(true);
create function pg_temp.assert(value boolean, message text) returns void language plpgsql as $$ begin if value is distinct from true then raise exception 'FAIL: %',message; end if; end $$;
set local role anon;
select pg_temp.assert(jsonb_array_length(public.public_community_directory())=1,'only public directory');
select pg_temp.assert(jsonb_array_length(public.public_community_posts())=1,'only public posts');
select pg_temp.assert((public.public_community_posts()->0->>'likes_count')::int=1,'aggregate likes');
select pg_temp.assert(public.public_community_posts()::text not like '%secret@example.com%','no profile emails');
select pg_temp.assert(jsonb_array_length(public.public_community_posts(null,'30000000-0000-0000-0000-000000000002'))=0,'private guessed post hidden');
select pg_temp.assert((public.public_post_comments('30000000-0000-0000-0000-000000000001')->>'total')::int=1,'public comments readable');
select pg_temp.assert((public.public_post_comments('30000000-0000-0000-0000-000000000002')->>'total')::int=0,'private comments hidden');
select pg_temp.assert((select count(*)=0 from public.ai_generations),'raw posts hidden');
select pg_temp.assert((select count(*)=0 from public.generation_votes),'voter identities hidden');
select pg_temp.assert((select count(*)=0 from public.community_members),'memberships hidden');
select pg_temp.assert((select count(*)=1 from storage.objects),'only attached public image readable');
do $$ begin
 begin insert into public.generation_votes values ('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001',1,now()); raise exception 'FAIL: guest vote allowed'; exception when insufficient_privilege then null; end;
 begin insert into public.community_members(community_id,user_id) values ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001'); raise exception 'FAIL: guest join allowed'; exception when insufficient_privilege then null; end;
 begin insert into public.ai_generations(user_id,image_path,prompt,caption) values ('10000000-0000-0000-0000-000000000001','new.jpg','new','new'); raise exception 'FAIL: guest post allowed'; exception when insufficient_privilege then null; end;
 begin insert into storage.objects(bucket_id,name) values ('generated-media','new.jpg'); raise exception 'FAIL: guest upload allowed'; exception when insufficient_privilege then null; end;
end $$;
with changed as (update public.ai_generations set caption='changed' returning *) select pg_temp.assert(count(*)=0,'guest update blocked') from changed;
with removed as (delete from storage.objects returning *) select pg_temp.assert(count(*)=0,'guest media delete blocked') from removed;
reset role;
-- A public file reused by a private post must not expose that private asset.
update public.ai_generations set image_path='public.jpg' where id='30000000-0000-0000-0000-000000000002';
set local role anon;
select pg_temp.assert(not public.public_can_preview_media('public.jpg'),'shared private file hidden');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select pg_temp.assert((select count(*)=3 from public.ai_generations),'signed-in owner keeps access');
rollback;
