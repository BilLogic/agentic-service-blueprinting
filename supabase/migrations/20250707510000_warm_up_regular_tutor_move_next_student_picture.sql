-- Warm-Up Happy path step 9 / Alternate path step 8 — Regular Tutor move to next student illustration

update public.cells
set picture = '/blueprint-images/warm-up/shared/regular-tutor/step-09-move-to-next-student.png'
where id in (
  'a0000000-0000-4000-8000-000000040903',
  'a0000000-0000-4000-8000-000000060903'
);
