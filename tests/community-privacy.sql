-- Run only in a disposable database with community migrations already applied.
-- Uses real RLS as authenticated/anon and rolls back every fixture.
begin;
insert into auth.users(id) values
 ('10000000-0000-0000-0000-000000000001'),
 ('10000000-0000-0000-0000-000000000002'),
 ('10000000-0000-0000-0000-000000000003');
insert into public.communities(id, name, description, visibility, created_by) values
 ('20000000-0000-0000-0000-000000000001', 'Privacy regression private', 'Private test', 'private', '10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000002', 'Privacy regression public', 'Public test', 'public', '10000000-0000-0000-0000-000000000001');
insert into public.ai_generations(id, user_id, community_id, image_path, prompt, caption) values
 ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001/private-test.jpg', 'Test prompt', 'Private caption'),
 ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001/public-test.jpg', 'Test prompt', 'Public caption');
insert into storage.objects(bucket_id, name) values
 ('generated-media', '10000000-0000-0000-0000-000000000001/private-test.jpg'),
 ('generated-media', '10000000-0000-0000-0000-000000000001/public-test.jpg');
insert into public.generation_votes(generation_id, user_id, vote) values
 ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1);

create function pg_temp.check_true(value boolean, message text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAIL: %', message; end if; end;
$$;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
insert into public.communities(id, name, visibility, created_by) values
 ('20000000-0000-0000-0000-000000000003', 'Owner creation regression', 'private', auth.uid());
select pg_temp.check_true(public.belongs_to_community('20000000-0000-0000-0000-000000000003'), 'authenticated creator receives private membership atomically');
select pg_temp.check_true((select count(*) = 2 from public.communities where name like 'Privacy regression%'), 'private community metadata remains discoverable');
select pg_temp.check_true((select count(*) = 0 from public.ai_generations where id = '30000000-0000-0000-0000-000000000001'), 'outsider cannot read private posts');
select pg_temp.check_true((select count(*) = 1 from public.ai_generations where id = '30000000-0000-0000-0000-000000000002'), 'public posts remain readable');
select pg_temp.check_true((select count(*) = 0 from public.generation_votes where generation_id = '30000000-0000-0000-0000-000000000001'), 'outsider cannot read private votes');
select pg_temp.check_true((select count(*) = 0 from storage.objects where name like '%private-test.jpg'), 'outsider cannot read private images');
select pg_temp.check_true((select count(*) = 1 from storage.objects where name like '%public-test.jpg'), 'public images remain readable');

do $$ begin
  begin
    insert into public.community_members(community_id, user_id) values('20000000-0000-0000-0000-000000000001', auth.uid());
    raise exception 'FAIL: private membership bypass succeeded';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.community_join_requests(community_id, user_id, status) values('20000000-0000-0000-0000-000000000001', auth.uid(), 'approved');
    raise exception 'FAIL: self-approved request succeeded';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.ai_generations(user_id, community_id, image_path, prompt, caption) values(auth.uid(), '20000000-0000-0000-0000-000000000001', 'bad.jpg', 'Test prompt', 'Not approved');
    raise exception 'FAIL: private post before approval succeeded';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.generation_votes(generation_id, user_id, vote) values('30000000-0000-0000-0000-000000000001', auth.uid(), 1);
    raise exception 'FAIL: private vote before approval succeeded';
  exception when insufficient_privilege then null; end;
end $$;
insert into public.community_members(community_id, user_id) values('20000000-0000-0000-0000-000000000002', auth.uid());
insert into public.community_join_requests(community_id, user_id) values('20000000-0000-0000-0000-000000000001', auth.uid());
select pg_temp.check_true(not public.can_read_community('20000000-0000-0000-0000-000000000001'), 'pending request does not grant access');
do $$ begin
  begin
    perform public.review_community_request('20000000-0000-0000-0000-000000000001', auth.uid(), true);
    raise exception 'FAIL: nonowner approval succeeded';
  exception when raise_exception then
    if sqlerrm <> 'Only the community owner can review requests.' then raise; end if;
  end;
end $$;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select pg_temp.check_true((select count(*) = 0 from public.community_join_requests where community_id = '20000000-0000-0000-0000-000000000001'), 'other users cannot read requests');
insert into public.community_join_requests(community_id, user_id) values('20000000-0000-0000-0000-000000000001', auth.uid());
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select pg_temp.check_true(public.belongs_to_community('20000000-0000-0000-0000-000000000001'), 'owner automatically becomes a member');
select pg_temp.check_true((select count(*) = 2 from public.community_join_requests where community_id = '20000000-0000-0000-0000-000000000001'), 'owner can see both requests');
select public.review_community_request('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', true);
select public.review_community_request('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', false);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select pg_temp.check_true(public.belongs_to_community('20000000-0000-0000-0000-000000000001'), 'approval grants membership');
select pg_temp.check_true((select count(*) = 1 from public.ai_generations where id = '30000000-0000-0000-0000-000000000001'), 'approved member can read private posts');
select pg_temp.check_true((select count(*) = 1 from storage.objects where name like '%private-test.jpg'), 'approved member can read private images');
insert into public.ai_generations(user_id, community_id, image_path, prompt, caption) values(auth.uid(), '20000000-0000-0000-0000-000000000001', 'approved.jpg', 'Test prompt', 'Approved caption');
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select pg_temp.check_true(not public.can_read_community('20000000-0000-0000-0000-000000000001'), 'declining does not grant membership');
select pg_temp.check_true((select status = 'rejected' from public.community_join_requests where community_id = '20000000-0000-0000-0000-000000000001' and user_id = auth.uid()), 'declined status persists');
set local role anon;
select pg_temp.check_true((select count(*) = 0 from public.ai_generations), 'anonymous users cannot read posts');
select pg_temp.check_true((select count(*) = 0 from storage.objects where bucket_id = 'generated-media'), 'anonymous users cannot read generated media');
rollback;
