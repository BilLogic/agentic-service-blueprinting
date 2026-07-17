-- Capitalize in-session and post-session phase names to match Pre-session.
update public.phases
set name = 'In-session'
where id = 'a0000000-0000-4000-8000-000000000104'
  and name = 'in-session';

update public.phases
set name = 'Post-session'
where id = 'a0000000-0000-4000-8000-000000000105'
  and name = 'post-session';
