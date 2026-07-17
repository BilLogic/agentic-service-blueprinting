-- Warm-Up Happy and Alternate paths — Regular Tutor step 2 illustration

update public.cells
set picture = '/blueprint-images/warm-up/shared/regular-tutor/step-02-greet-student.png'
where id in (
  'a0000000-0000-4000-8000-000000040203',
  'a0000000-0000-4000-8000-000000060203'
);
