-- Allow integrated view type on service scenarios.

alter table public.service_scenarios
  drop constraint if exists service_scenarios_view_type_check;

alter table public.service_scenarios
  add constraint service_scenarios_view_type_check check (
    view_type in ('single', 'side-by-side', 'integrated')
  );

comment on column public.service_scenarios.view_type is
  'Blueprint layout: single path, side-by-side compare, or integrated merge.';
