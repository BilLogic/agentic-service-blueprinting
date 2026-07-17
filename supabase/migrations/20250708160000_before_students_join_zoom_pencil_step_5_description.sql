-- Before Students Join Happy Path step 5 — update Zoom/Pencil Front Stage Tech description

update public.cells
set
  picture = '/blueprint-images/goal-setting/shared/front-stage-tech/zoom-logo.png',
  description = 'The Lead tutor reminds the regular tutor via Zoom/Pencil to go through rooms in order of the dashboard list.'
where id = 'a0000000-0000-4000-8000-000000180506';
