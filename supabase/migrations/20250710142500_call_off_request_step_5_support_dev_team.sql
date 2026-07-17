-- Call-off Request step 5: add Dev Team Support Actions cell.

insert into public.cells (id, path_id, layer_id, step_id, content, description)
values (
  'a0000000-0000-4000-8000-000000170509',
  'a0000000-0000-4000-8000-000000000808',
  'a0000000-0000-4000-8000-000000000977',
  'a0000000-0000-4000-8000-000000000944',
  'Dev Team',
  'The Dev Team builds and maintains the Google Spreadsheet used to track call-off coverage and excused or unexcused decisions.'
)
on conflict (id) do update
set path_id = excluded.path_id,
    layer_id = excluded.layer_id,
    step_id = excluded.step_id,
    content = excluded.content,
    description = excluded.description;
