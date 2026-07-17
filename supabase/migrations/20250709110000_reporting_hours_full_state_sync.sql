-- Reporting Hours — reconcile full happy-path state (content, links, triggers).

update public.path_steps
set column_position = 2
where path_id = 'a0000000-0000-4000-8000-000000000812'
  and step_id = 'a0000000-0000-4000-8000-000000000994';

update public.path_steps
set column_position = 3
where path_id = 'a0000000-0000-4000-8000-000000000812'
  and step_id = 'a0000000-0000-4000-8000-000000000995';

update public.cells
set content = 'Report hours by week deadline'
where id in (
  'a0000000-0000-4000-8000-0000001e0102',
  'a0000000-0000-4000-8000-0000001e0103'
);

update public.cells
set content = 'PLUS supervisor team reviews and approves hours'
where id = 'a0000000-0000-4000-8000-0000001e0307';

update public.cells
set content = 'Receives biweekly paycheck'
where id in (
  'a0000000-0000-4000-8000-0000001e0202',
  'a0000000-0000-4000-8000-0000001e0203'
);

update public.cells
set picture = '/blueprint-images/shared/step-visual-placeholder.svg'
where path_id = 'a0000000-0000-4000-8000-000000000812'
  and id in (
    'a0000000-0000-4000-8000-0000001e0102',
    'a0000000-0000-4000-8000-0000001e0103',
    'a0000000-0000-4000-8000-0000001e0202',
    'a0000000-0000-4000-8000-0000001e0203'
  );

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Workday',
    'description', 'The tutor logs and submits tutoring hours in Workday by the deadline.',
    'picture', '/blueprint-images/shared/front-stage-tech/workday-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-0000001e0106';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Workday',
    'description', 'The PLUS supervisor team reviews submitted hours and approves them in Workday.',
    'picture', '/blueprint-images/shared/front-stage-tech/workday-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-0000001e0308';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Bank',
    'description', 'The tutor receives their biweekly paycheck via direct deposit to their bank account.'
  )
)
where id = 'a0000000-0000-4000-8000-0000001e0206';

delete from public.cell_triggers
where source_cell_id in (
  select id from public.cells
  where path_id = 'a0000000-0000-4000-8000-000000000812'
)
and id not in (
  'a0000000-0000-4000-8000-000000098085',
  'a0000000-0000-4000-8000-000000098086',
  'a0000000-0000-4000-8000-000000098090',
  'a0000000-0000-4000-8000-000000098091',
  'a0000000-0000-4000-8000-000000098092',
  'a0000000-0000-4000-8000-000000098093',
  'a0000000-0000-4000-8000-000000098094'
);

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  ('a0000000-0000-4000-8000-000000098090', 'a0000000-0000-4000-8000-0000001e0103', 'a0000000-0000-4000-8000-0000001e0106'),
  ('a0000000-0000-4000-8000-000000098091', 'a0000000-0000-4000-8000-0000001e0102', 'a0000000-0000-4000-8000-0000001e0106'),
  ('a0000000-0000-4000-8000-000000098094', 'a0000000-0000-4000-8000-0000001e0106', 'a0000000-0000-4000-8000-0000001e0307'),
  ('a0000000-0000-4000-8000-000000098085', 'a0000000-0000-4000-8000-0000001e0307', 'a0000000-0000-4000-8000-0000001e0308'),
  ('a0000000-0000-4000-8000-000000098086', 'a0000000-0000-4000-8000-0000001e0308', 'a0000000-0000-4000-8000-0000001e0206'),
  ('a0000000-0000-4000-8000-000000098092', 'a0000000-0000-4000-8000-0000001e0206', 'a0000000-0000-4000-8000-0000001e0202'),
  ('a0000000-0000-4000-8000-000000098093', 'a0000000-0000-4000-8000-0000001e0206', 'a0000000-0000-4000-8000-0000001e0203')
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
