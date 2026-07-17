-- Blueprint layout mode for scenario slides in the editor.

alter table public.service_scenarios
  add column if not exists view_type text not null default 'single';

alter table public.service_scenarios
  drop constraint if exists service_scenarios_view_type_check;

alter table public.service_scenarios
  add constraint service_scenarios_view_type_check check (
    view_type in ('single', 'side-by-side')
  );

comment on column public.service_scenarios.view_type is
  'Editor blueprint layout: single path at a time, or side-by-side path comparison.';

update public.service_scenarios
set view_type = 'side-by-side'
where id = 'a0000000-0000-4000-8000-000000000203';
