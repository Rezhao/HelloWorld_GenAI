-- Disposable database only; run with community and comment migrations applied.
begin;
insert into auth.users(id) values
 ('10000000-0000-0000-0000-000000000001'),
 ('10000000-0000-0000-0000-000000000002'),
 ('10000000-0000-0000-0000-000000000003');
insert into public.communities(id, name, visibility, created_by) values
 ('20000000-0000-0000-0000-000000000001', 'Comment regression private', 'private', '10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000002', 'Comment regression public', 'public', '10000000-0000-0000-0000-000000000001');
insert into public.community_members(community_id, user_id) values
 ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002');
insert into public.ai_generations(id, user_id, community_id, image_path, prompt, caption) values
 ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'private.jpg', 'Test prompt', 'Private caption'),
 ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'public.jpg', 'Test prompt', 'Public caption');
insert into public.generation_comments(id, generation_id, user_id, body) values
 ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Private comment'),
 ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Public comment');
create function pg_temp.check_true(value boolean, message text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAIL: %', message; end if; end;
$$;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select pg_temp.check_true((select count(*) = 0 from public.generation_comments where generation_id = '30000000-0000-0000-0000-000000000001'), 'private comments hidden from outsider');
select pg_temp.check_true((select count(*) = 1 from public.generation_comments where generation_id = '30000000-0000-0000-0000-000000000002'), 'public comments readable');
do $$ begin
  begin
    insert into public.generation_comments(generation_id, user_id, body) values('30000000-0000-0000-0000-000000000001', auth.uid(), 'No permission');
    raise exception 'FAIL: private comment bypass';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.generation_comments(generation_id, user_id, body) values('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Forged author');
    raise exception 'FAIL: comment author spoof';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.generation_comments(generation_id, user_id, body) values('30000000-0000-0000-0000-000000000002', auth.uid(), E' \n\t ');
    raise exception 'FAIL: whitespace-only comment';
  exception when check_violation then null; end;
  begin
    insert into public.generation_comments(generation_id, user_id, body) values('30000000-0000-0000-0000-000000000002', auth.uid(), repeat('a', 2001));
    raise exception 'FAIL: overlong comment';
  exception when check_violation then null; end;
end $$;
insert into public.generation_comments(id, generation_id, user_id, body) values('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', auth.uid(), 'A new public comment');
delete from public.generation_comments where id = '40000000-0000-0000-0000-000000000002';
select pg_temp.check_true((select count(*) = 1 from public.generation_comments where id = '40000000-0000-0000-0000-000000000002'), 'cannot delete another author comment');
delete from public.generation_comments where id = '40000000-0000-0000-0000-000000000003';
select pg_temp.check_true((select count(*) = 0 from public.generation_comments where id = '40000000-0000-0000-0000-000000000003'), 'can delete own comment');
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select pg_temp.check_true((select count(*) = 1 from public.generation_comments where generation_id = '30000000-0000-0000-0000-000000000001'), 'approved private member can read comments');
insert into public.generation_comments(generation_id, user_id, body) values('30000000-0000-0000-0000-000000000001', auth.uid(), 'Approved member comment');
set local role anon;
do $$ begin
  begin
    perform 1 from public.generation_comments;
    raise exception 'FAIL: anonymous comment read';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.generation_comments(generation_id, user_id, body) values('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'Anonymous comment');
    raise exception 'FAIL: anonymous comment insert';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
delete from public.generation_votes where generation_id = '30000000-0000-0000-0000-000000000001';
delete from public.ai_generations where id = '30000000-0000-0000-0000-000000000001';
select pg_temp.check_true((select count(*) = 0 from public.generation_comments where generation_id = '30000000-0000-0000-0000-000000000001'), 'post deletion cascades to comments');
rollback;
