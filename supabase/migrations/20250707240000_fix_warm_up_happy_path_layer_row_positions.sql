-- Fix Warm-Up Happy Path layer row positions after Tutor Resources removal drift.

update public.layers
set row_position = 1
where id = 'a0000000-0000-4000-8000-000000000301';

update public.layers
set row_position = 2
where id = 'a0000000-0000-4000-8000-000000000302';

update public.layers
set row_position = 3
where id = 'a0000000-0000-4000-8000-000000000303';

update public.layers
set row_position = 4
where id = 'a0000000-0000-4000-8000-000000000306';

update public.layers
set row_position = 5
where id = 'a0000000-0000-4000-8000-000000000304';

update public.layers
set row_position = 6
where id = 'a0000000-0000-4000-8000-000000000307';

update public.layers
set row_position = 7
where id = 'a0000000-0000-4000-8000-000000000308';

update public.layers
set row_position = 8
where id = 'a0000000-0000-4000-8000-000000000309';
