-- Warm-Up Happy Path: step 4 (Remind Student They Can Ask for Help)
delete from public.cells
where id = 'a0000000-0000-4000-8000-000000040401';

update public.cells
set content = 'Remind them that they can ask for help on content and support'
where id = 'a0000000-0000-4000-8000-000000040403';

update public.cells
set content = 'Onboarding & Lessons Modules'
where id = 'a0000000-0000-4000-8000-000000040405';

update public.cells
set content = E'Zoom/Pencil\nPLUS App\nSlack'
where id = 'a0000000-0000-4000-8000-000000040406';

update public.cells
set content = E'Dev Team\nDesign team'
where id = 'a0000000-0000-4000-8000-000000040409';
