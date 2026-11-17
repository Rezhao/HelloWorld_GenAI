-- Disposable local database only. Run after the community and leave-community migrations.
begin;
insert into auth.users(id) values ('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002'),('10000000-0000-0000-0000-000000000003');
insert into public.communities(id,name,created_by,visibility) values
 ('20000000-0000-0000-0000-000000000001','Leave public test','10000000-0000-0000-0000-000000000001','public'),
 ('20000000-0000-0000-0000-000000000002','Leave private test','10000000-0000-0000-0000-000000000001','private');
insert into public.community_members(community_id,user_id) values
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002'),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002'),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003');
insert into public.community_join_requests(community_id,user_id,status) values ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','approved');
insert into public.ai_generations(user_id,community_id,image_path,prompt,caption) values ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','private-leave.jpg','private','private');
create function pg_temp.assert(value boolean,message text) returns void language plpgsql as $$ begin if value is distinct from true then raise exception 'FAIL: %',message; end if; end $$;
set local role anon;
do $$ begin
 begin perform public.leave_community('20000000-0000-0000-0000-000000000002'); raise exception 'FAIL: anonymous leave'; exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select public.leave_community('20000000-0000-0000-0000-000000000001');
select pg_temp.assert(not public.belongs_to_community('20000000-0000-0000-0000-000000000001'),'public member can leave');
insert into public.community_members(community_id,user_id) values ('20000000-0000-0000-0000-000000000001',auth.uid());
select pg_temp.assert(public.belongs_to_community('20000000-0000-0000-0000-000000000001'),'public member can rejoin');
select pg_temp.assert((select count(*)=1 from public.ai_generations),'private post visible before leaving');
select public.leave_community('20000000-0000-0000-0000-000000000002');
select pg_temp.assert(not public.belongs_to_community('20000000-0000-0000-0000-000000000002'),'private member can leave');
select pg_temp.assert((select count(*)=0 from public.ai_generations),'private content inaccessible after leaving');
select pg_temp.assert((select count(*)=0 from public.community_join_requests),'old approval removed');
insert into public.community_join_requests(community_id,user_id) values ('20000000-0000-0000-0000-000000000002',auth.uid());
select pg_temp.assert(not public.can_read_community('20000000-0000-0000-0000-000000000002'),'fresh request needs approval');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$ begin
 begin perform public.leave_community('20000000-0000-0000-0000-000000000002'); raise exception 'FAIL: owner left'; exception when raise_exception then if sqlerrm <> 'Community owners cannot leave their own community.' then raise; end if; end;
end $$;
select pg_temp.assert(public.belongs_to_community('20000000-0000-0000-0000-000000000002'),'owner retains membership');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select pg_temp.assert(public.belongs_to_community('20000000-0000-0000-0000-000000000002'),'other member unchanged');
rollback;
