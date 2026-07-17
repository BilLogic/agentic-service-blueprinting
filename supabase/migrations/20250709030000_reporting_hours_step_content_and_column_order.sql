-- Reporting Hours — step content and column order (Report → Approve → Receive).

update public.path_steps
set column_position = 10
where path_id = 'a0000000-0000-4000-8000-000000000812'
  and step_id = 'a0000000-0000-4000-8000-000000000995';

update public.path_steps
set column_position = 2
where path_id = 'a0000000-0000-4000-8000-000000000812'
  and step_id = 'a0000000-0000-4000-8000-000000000994';

update public.path_steps
set column_position = 3
where path_id = 'a0000000-0000-4000-8000-000000000812'
  and step_id = 'a0000000-0000-4000-8000-000000000995';

update public.cells
set content = 'PLUS Supervisor team reviews and approves hours'
where id = 'a0000000-0000-4000-8000-0000001e0307';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Workday',
    'description', 'The PLUS Supervisor team reviews submitted hours and approves them in Workday.'
  )
)
where id = 'a0000000-0000-4000-8000-0000001e0308';
