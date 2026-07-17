-- Tech Setup step 4: add Front Stage Tech Workday.

insert into public.cells (id, path_id, layer_id, step_id, content, links)
values (
  'a0000000-0000-4000-8000-000000100406',
  'a0000000-0000-4000-8000-000000000800',
  'a0000000-0000-4000-8000-000000000833',
  'a0000000-0000-4000-8000-000000000826',
  'Workday',
  jsonb_build_array(
    jsonb_build_object(
      'type', 'tech_description',
      'label', 'Workday',
      'description', 'The tutor schedules an I-9 meeting with CMU HR through Workday.',
      'picture', '/blueprint-images/shared/front-stage-tech/workday-logo.png'
    )
  )
)
on conflict (id) do update
set path_id = excluded.path_id,
    layer_id = excluded.layer_id,
    step_id = excluded.step_id,
    content = excluded.content,
    links = excluded.links;
