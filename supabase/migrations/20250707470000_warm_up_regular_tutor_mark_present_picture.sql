-- Warm-Up Happy path step 5 / Alternate path step 4 — Regular Tutor mark as present illustration

update public.cells
set picture = '/blueprint-images/warm-up/shared/regular-tutor/step-05-mark-as-present.png'
where id in (
  'a0000000-0000-4000-8000-000000040503',
  'a0000000-0000-4000-8000-000000060503'
);
