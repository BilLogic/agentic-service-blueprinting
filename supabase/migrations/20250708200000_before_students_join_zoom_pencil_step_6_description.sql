-- Before Students Join Happy Path step 6 — update Zoom/Pencil Front Stage Tech description

update public.cells
set
  picture = '/blueprint-images/goal-setting/shared/front-stage-tech/zoom-logo.png',
  description = 'The lead tutor shares the breakout room list with regular tutor on Zoom/Pencil.'
where id = 'a0000000-0000-4000-8000-000000180606';
