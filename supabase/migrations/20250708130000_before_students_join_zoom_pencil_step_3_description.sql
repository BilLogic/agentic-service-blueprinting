-- Before Students Join Happy Path step 3 — update Zoom/Pencil Front Stage Tech description

update public.cells
set
  picture = '/blueprint-images/goal-setting/shared/front-stage-tech/zoom-logo.png',
  description = 'On Zoom/Pencil, the lead tutor takes tutor attendance. Tutors sign in with the lead tutor and confirm they have co-host permissions.'
where id = 'a0000000-0000-4000-8000-000000180306';
