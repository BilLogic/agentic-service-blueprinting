-- Students Just Joined Happy Path step 2 — update Zoom/Pencil Front Stage Tech description

update public.cells
set
  picture = '/blueprint-images/goal-setting/shared/front-stage-tech/zoom-logo.png',
  description = 'On Zoom/Pencil, the lead tutor mutes students if necessary while they share screen with the Teacher and log into math software.'
where id = 'a0000000-0000-4000-8000-000000190206';
