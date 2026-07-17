-- Before Students Join: update Zoom/Pencil Front Stage Tech descriptions (steps 2–6).

update public.cells
set description = 'Tutors join the session via Zoom/Pencil.'
where id = 'a0000000-0000-4000-8000-000000180206';

update public.cells
set description = 'Tutors sign in for the session via Zoom/Pencil.'
where id = 'a0000000-0000-4000-8000-000000180306';

update public.cells
set description = 'Lead tutors create breakout rooms on Zoom/Pencil.'
where id = 'a0000000-0000-4000-8000-000000180406';

update public.cells
set description = 'Lead tutors connect with regular tutors on Zoom/Pencil about the student list.'
where id = 'a0000000-0000-4000-8000-000000180506';

update public.cells
set description = 'Lead tutors connect with regular tutors about assigned breakout rooms via Zoom/Pencil.'
where id = 'a0000000-0000-4000-8000-000000180606';
