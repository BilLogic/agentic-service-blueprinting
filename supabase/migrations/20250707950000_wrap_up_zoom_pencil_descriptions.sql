-- Wrap-Up Happy Path — Zoom/Pencil Front Stage Tech descriptions (steps 1–3)

update public.cells
set description =
  'Once tutoring ends, the tutor leaves breakout session and joins the main room on Zoom/Pencil.'
where id = 'a0000000-0000-4000-8000-0000001c0106';

update public.cells
set description =
  'In the main room on Zoom/Pencil, the tutors thank the students.'
where id = 'a0000000-0000-4000-8000-0000001c0206';

update public.cells
set description =
  'In the main room on Zoom/Pencil, the tutors debrief with the lead tutors.'
where id = 'a0000000-0000-4000-8000-0000001c0306';
