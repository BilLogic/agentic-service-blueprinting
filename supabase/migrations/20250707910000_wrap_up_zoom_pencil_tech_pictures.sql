-- Wrap-Up Happy Path — Zoom/Pencil Front Stage Tech logos (steps 1–3)

update public.cells
set picture = '/blueprint-images/goal-setting/shared/front-stage-tech/zoom-logo.png'
where id in (
  'a0000000-0000-4000-8000-0000001c0106',
  'a0000000-0000-4000-8000-0000001c0206',
  'a0000000-0000-4000-8000-0000001c0306'
);
