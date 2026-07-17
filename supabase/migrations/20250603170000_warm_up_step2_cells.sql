-- Warm-Up Happy Path: step 2 (Greet Student) cell content
insert into public.cells (id, path_id, layer_id, step_id, content)
values (
  'a0000000-0000-4000-8000-000000040201',
  'a0000000-0000-4000-8000-000000000300',
  'a0000000-0000-4000-8000-000000000301',
  'a0000000-0000-4000-8000-000000000312',
  'Remind students to keep working while waiting'
)
on conflict (id) do update set content = excluded.content;

update public.cells
set content = 'Onboarding & Lessons Modules'
where id = 'a0000000-0000-4000-8000-000000040205';

update public.cells
set content = E'Zoom/Pencil\nPLUS App\nSlack'
where id = 'a0000000-0000-4000-8000-000000040206';

update public.cells
set content = E'Dev Team\nDesign team'
where id = 'a0000000-0000-4000-8000-000000040209';
