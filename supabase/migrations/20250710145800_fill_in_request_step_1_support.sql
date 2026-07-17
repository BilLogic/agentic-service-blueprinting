-- Fill-in Request step 1: add Support Actions cell (Dev Team).

insert into public.cells (id, path_id, layer_id, step_id, content, description)
values (
  'a0000000-0000-4000-8000-000000150109',
  'a0000000-0000-4000-8000-000000000807',
  'a0000000-0000-4000-8000-000000000909',
  'a0000000-0000-4000-8000-000000000897',
  'Dev Team',
  'The Dev Team stores tutor schedules in a Google Spreadsheet for the tutor supervisor team to review.'
)
on conflict (id) do update set
  path_id = excluded.path_id,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id,
  content = excluded.content,
  description = excluded.description;
