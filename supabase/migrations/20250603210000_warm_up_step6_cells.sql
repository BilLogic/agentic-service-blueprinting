-- Warm-Up Happy Path: step 6 (Select Engagement level)
delete from public.cells
where id = 'a0000000-0000-4000-8000-000000040601';

update public.steps
set name = 'Select Engagement level'
where id = 'a0000000-0000-4000-8000-000000000316';

update public.cells
set content = 'Select Engagement level'
where id = 'a0000000-0000-4000-8000-000000040603';

update public.cells
set content = 'Onboarding & Lessons Modules'
where id = 'a0000000-0000-4000-8000-000000040605';

update public.cells
set content = E'Zoom/Pencil\nPLUS App\nSlack'
where id = 'a0000000-0000-4000-8000-000000040606';

update public.cells
set content = E'Dev Team\nDesign team'
where id = 'a0000000-0000-4000-8000-000000040609';
