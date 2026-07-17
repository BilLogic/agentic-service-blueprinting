-- Warm-Up Happy Path: rename Tutor Support Actions → Tutor Resources
update public.layers
set name = 'Tutor Resources'
where id = 'a0000000-0000-4000-8000-000000000305';

-- Step 1 (Enter Breakout Room) cell content
update public.cells
set content = 'Enter Breakout room'
where id = 'a0000000-0000-4000-8000-000000040103';

update public.cells
set content = 'Onboarding & Lessons Modules'
where id = 'a0000000-0000-4000-8000-000000040105';

update public.cells
set content = E'Zoom/Pencil\nPLUS App\nSlack'
where id = 'a0000000-0000-4000-8000-000000040106';

update public.cells
set content = E'Dev Team\nDesign team'
where id = 'a0000000-0000-4000-8000-000000040109';
