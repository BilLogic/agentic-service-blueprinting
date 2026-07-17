-- Reporting Hours — align content and U-shaped connections with blueprint image.

update public.cells
set content = 'LMS/Business Team reviews and approves hours'
where id = 'a0000000-0000-4000-8000-0000001e0307';

update public.cells
set content = 'Receives Biweekly Paycheck'
where id in (
  'a0000000-0000-4000-8000-0000001e0202',
  'a0000000-0000-4000-8000-0000001e0203'
);

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Workday',
    'description', 'The LMS/Business Team reviews submitted hours and approves them in Workday.'
  )
)
where id = 'a0000000-0000-4000-8000-0000001e0308';

delete from public.cell_triggers
where source_cell_id in (
  select id from public.cells
  where path_id = 'a0000000-0000-4000-8000-000000000812'
);

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  ('a0000000-0000-4000-8000-000000098090', 'a0000000-0000-4000-8000-0000001e0103', 'a0000000-0000-4000-8000-0000001e0307'),
  ('a0000000-0000-4000-8000-000000098091', 'a0000000-0000-4000-8000-0000001e0102', 'a0000000-0000-4000-8000-0000001e0307'),
  ('a0000000-0000-4000-8000-000000098092', 'a0000000-0000-4000-8000-0000001e0307', 'a0000000-0000-4000-8000-0000001e0202'),
  ('a0000000-0000-4000-8000-000000098093', 'a0000000-0000-4000-8000-0000001e0307', 'a0000000-0000-4000-8000-0000001e0203')
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
