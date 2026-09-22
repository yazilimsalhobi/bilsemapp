-- Run once in this project's Supabase SQL editor BEFORE publishing the new app.
-- Transactional: no existing data is deleted. Only this verified auth user inherits it.
begin;
create table if not exists public.user_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.user_workspaces enable row level security;
revoke all on public.user_workspaces from anon;
grant select, insert, update, delete on public.user_workspaces to authenticated;
drop policy if exists workspace_owner on public.user_workspaces;
create policy workspace_owner on public.user_workspaces for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Restrictive policies also constrain previously installed permissive policies.
do $$
declare admin_id uuid; t text; groups_json jsonb; attendance_json jsonb;
begin
  select id into admin_id from auth.users where lower(email) = 'admin@fatsabilsem.com';
  if admin_id is null then raise exception 'admin@fatsabilsem.com hesabı auth.users içinde bulunamadı. İşlem geri alındı.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', g.id, 'name', g.name, 'day', g.day, 'dayIndex', g.day_index,
    'startTime', g.start_time, 'endTime', g.end_time, 'timeSlot', g.time_slot,
    'subject', g.subject, 'color', g.color,
    'lessons', coalesce(to_jsonb(g)->'lessons', jsonb_build_array(jsonb_build_object('order', 1, 'start', g.start_time, 'end', g.end_time))),
    'students', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'parentName', coalesce(s.parent_name, ''), 'parentPhone', coalesce(s.parent_phone, ''))) from public.students s where s.group_id = g.id), '[]'::jsonb)
  )), '[]'::jsonb) into groups_json from public.groups g;
  select coalesce(jsonb_object_agg(group_id::text || '_' || date::text, entry), '{}'::jsonb) into attendance_json from (
    select group_id, date, jsonb_build_object('groupId', group_id, 'date', date,
      'records', jsonb_agg(jsonb_build_object('studentId', student_id, 'status', status))) entry
    from public.attendance group by group_id, date
  ) a;
  insert into public.user_workspaces(user_id, payload) values (admin_id, jsonb_build_object(
    'bilsem_settings', jsonb_build_object('schoolInfo', jsonb_build_object('name', 'Fatsa BİLSEM', 'teacher', 'Harun Berna Mutlu', 'department', 'Coğrafya & Sosyal Bilgiler', 'year', '2026-2027'), 'customGroups', groups_json, 'onboardingComplete', true),
    'bilsem_attendance', attendance_json
  )) on conflict (user_id) do nothing;
  foreach t in array array['groups', 'students', 'attendance'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('drop policy if exists legacy_admin_only on public.%I', t);
    execute format('create policy legacy_admin_only on public.%I as restrictive for all to authenticated using (auth.uid() = %L::uuid) with check (auth.uid() = %L::uuid)', t, admin_id, admin_id);
  end loop;
end $$;
commit;
