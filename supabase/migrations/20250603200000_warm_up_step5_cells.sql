-- Warm-Up Happy Path: step 5 (Mark Student Present)
update public.cells
set content = 'Onboarding & Lessons Modules'
where id = 'a0000000-0000-4000-8000-000000040505';

update public.cells
set content = E'Zoom/Pencil\nPLUS App\nSlack'
where id = 'a0000000-0000-4000-8000-000000040506';

update public.cells
set content = E'Dev Team\nDesign team'
where id = 'a0000000-0000-4000-8000-000000040509';
