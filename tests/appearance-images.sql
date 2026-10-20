-- Rollback-only regression. Run in a disposable DB with Melon migrations applied.
begin;
insert into auth.users(id) values('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002');
insert into public.profiles(id) values('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002');
insert into public.communities(id,name,visibility,created_by) values
 ('20000000-0000-0000-0000-000000000001','Appearance private fixture','private','10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000002','Appearance public fixture','public','10000000-0000-0000-0000-000000000002');
create function pg_temp.check_true(value boolean, message text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAIL: %',message; end if; end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select pg_temp.check_true(public.can_manage_appearance('communities/20000000-0000-0000-0000-000000000001/avatar/test.png'),'owner can manage community avatar');
select pg_temp.check_true(not public.can_manage_appearance('communities/20000000-0000-0000-0000-000000000002/avatar/test.png'),'nonowner cannot manage another community');
select pg_temp.check_true(not public.can_manage_appearance('profiles/10000000-0000-0000-0000-000000000002/banner/test.png'),'cannot upload another profile background');
select pg_temp.check_true(not public.can_manage_appearance('profiles/10000000-0000-0000-0000-000000000001/banner/../test.png'),'reject traversal paths');
insert into storage.objects(bucket_id,name) values
 ('appearance-images','communities/20000000-0000-0000-0000-000000000001/avatar/test.png'),
 ('appearance-images','communities/20000000-0000-0000-0000-000000000001/banner/test.png'),
 ('appearance-images','profiles/10000000-0000-0000-0000-000000000001/banner/test.png');
select public.set_community_image('20000000-0000-0000-0000-000000000001','avatar','communities/20000000-0000-0000-0000-000000000001/avatar/test.png');
select public.set_community_image('20000000-0000-0000-0000-000000000001','banner','communities/20000000-0000-0000-0000-000000000001/banner/test.png');
select public.set_profile_banner('profiles/10000000-0000-0000-0000-000000000001/banner/test.png');
select pg_temp.check_true((select avatar_path is not null and banner_path is not null from public.communities where id='20000000-0000-0000-0000-000000000001'),'community photos saved');
select pg_temp.check_true((select banner_path is not null from public.profiles where id=auth.uid()),'own background saved');
do $$ begin
 begin perform public.set_community_image('20000000-0000-0000-0000-000000000002','avatar',null); raise exception 'FAIL: nonowner edit'; exception when insufficient_privilege then null; end;
 begin insert into storage.objects(bucket_id,name) values('appearance-images','communities/20000000-0000-0000-0000-000000000002/avatar/forged.png'); raise exception 'FAIL: nonowner upload'; exception when insufficient_privilege then null; end;
 begin perform public.set_profile_banner('profiles/10000000-0000-0000-0000-000000000002/banner/test.png'); raise exception 'FAIL: another profile path'; exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
 begin perform public.set_community_image('20000000-0000-0000-0000-000000000001','banner','communities/20000000-0000-0000-0000-000000000001/avatar/test.png'); raise exception 'FAIL: wrong photo slot'; exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
 begin perform public.set_community_image('20000000-0000-0000-0000-000000000001','created_by',null); raise exception 'FAIL: arbitrary field'; exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
delete from storage.objects where bucket_id='appearance-images' and name='communities/20000000-0000-0000-0000-000000000001/avatar/test.png';
select pg_temp.check_true((select count(*)=1 from storage.objects where name='communities/20000000-0000-0000-0000-000000000001/avatar/test.png'),'nonowner cannot delete image');
set local role anon;
select pg_temp.check_true((select count(*)=3 from storage.objects where bucket_id='appearance-images'),'decorative photos readable anonymously');
do $$ begin
 begin perform public.set_profile_banner(null); raise exception 'FAIL: anonymous profile change'; exception when insufficient_privilege then null; end;
 begin perform public.set_community_image('20000000-0000-0000-0000-000000000001','banner',null); raise exception 'FAIL: anonymous community change'; exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select public.set_community_image('20000000-0000-0000-0000-000000000001','avatar',null);
select public.set_community_image('20000000-0000-0000-0000-000000000001','banner',null);
select public.set_profile_banner(null);
select pg_temp.check_true((select avatar_path is null and banner_path is null from public.communities where id='20000000-0000-0000-0000-000000000001'),'removal restores community defaults');
select pg_temp.check_true((select banner_path is null from public.profiles where id=auth.uid()),'removal restores profile gradient');
rollback;
