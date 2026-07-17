-- Fill-in Request: move step 5 Regular Tutor + Front Stage Tech into step 4,
-- then remove the Access session step.

insert into public.cells (id, path_id, layer_id, step_id, content)
values
  (
    'a0000000-0000-4000-8000-000000150403',
    'a0000000-0000-4000-8000-000000000807',
    'a0000000-0000-4000-8000-000000000904',
    'a0000000-0000-4000-8000-000000000900',
    'Tutor accesses session if able to fill in'
  ),
  (
    'a0000000-0000-4000-8000-000000150406',
    'a0000000-0000-4000-8000-000000000807',
    'a0000000-0000-4000-8000-000000000906',
    'a0000000-0000-4000-8000-000000000900',
    'PLUS App'
  )
on conflict (id) do update set
  path_id = excluded.path_id,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id,
  content = excluded.content;

delete from public.cells
where id in (
  'a0000000-0000-4000-8000-000000150503',
  'a0000000-0000-4000-8000-000000150506',
  'a0000000-0000-4000-8000-000000150509',
  'a0000000-0000-4000-8000-000000150510'
);

delete from public.path_steps
where path_id = 'a0000000-0000-4000-8000-000000000807'
  and step_id = 'a0000000-0000-4000-8000-000000000901';

delete from public.steps
where id = 'a0000000-0000-4000-8000-000000000901'
  and not exists (
    select 1 from public.path_steps ps
    where ps.step_id = 'a0000000-0000-4000-8000-000000000901'
  );
