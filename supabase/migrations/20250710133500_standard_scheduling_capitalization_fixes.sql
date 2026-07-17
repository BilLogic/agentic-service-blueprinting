-- Standard Scheduling Happy Path — sentence-case capitalization + trailing periods.

update public.paths
set description = 'The tutors receive semester schedule.'
where id = 'a0000000-0000-4000-8000-000000000806';

update public.cells
set content =
  'Tutor supervisor team receives and reviews tutor schedules from the Dev Team.'
where id = 'a0000000-0000-4000-8000-000000140107';

update public.cells
set content = 'Receive schedule for the semester.'
where id = 'a0000000-0000-4000-8000-000000140203';

update public.cells
set content = 'Tutor supervisor team sends schedule.'
where id = 'a0000000-0000-4000-8000-000000140204';
