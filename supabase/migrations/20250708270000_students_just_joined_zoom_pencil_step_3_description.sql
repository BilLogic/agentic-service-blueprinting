-- Students Just Joined Happy Path step 3 — update Zoom/Pencil Front Stage Tech description

update public.cells
set
  picture = '/blueprint-images/goal-setting/shared/front-stage-tech/zoom-logo.png',
  description = 'Regular tutors move their students to their corresponding breakout room on Zoom/Pencil.'
where id = 'a0000000-0000-4000-8000-000000190306';
