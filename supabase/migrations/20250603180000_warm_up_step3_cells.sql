-- Warm-Up Happy Path: step 3 (Ask Student to Share Screen) cell content
insert into public.cells (id, path_id, layer_id, step_id, content)
values (
  'a0000000-0000-4000-8000-000000040301',
  'a0000000-0000-4000-8000-000000000300',
  'a0000000-0000-4000-8000-000000000301',
  'a0000000-0000-4000-8000-000000000313',
  'Checks if all students are in the correct breakout room'
)
on conflict (id) do update set content = excluded.content;

update public.cells
set content = 'Ask them to share screen'
where id = 'a0000000-0000-4000-8000-000000040303';

update public.cells
set content = 'Onboarding & Lessons Modules'
where id = 'a0000000-0000-4000-8000-000000000305';

update public.cells
set content = E'Zoom/Pencil\nPLUS App\nSlack'
where id = 'a0000000-0000-4000-8000-000000040306';

update public.cells
set content = E'Dev Team\nDesign team'
where id = 'a0000000-0000-4000-8000-000000040309';
