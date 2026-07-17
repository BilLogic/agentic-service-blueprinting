-- Update Warm-Up scenario description

update public.service_scenarios
set description = 'Tutors greet and move students to breakout rooms as the session begins.'
where id = 'a0000000-0000-4000-8000-000000000203';
