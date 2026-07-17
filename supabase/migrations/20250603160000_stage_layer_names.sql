-- Warm-Up Happy Path: service blueprint stage layer names
update public.layers
set name = 'Front Stage Tech'
where id = 'a0000000-0000-4000-8000-000000000306';

update public.layers
set name = 'Front Stage Actions'
where id = 'a0000000-0000-4000-8000-000000000304';

update public.layers
set name = 'Back Stage Actions'
where id = 'a0000000-0000-4000-8000-000000000307';

update public.layers
set name = 'Back Stage Tech'
where id = 'a0000000-0000-4000-8000-000000000308';
