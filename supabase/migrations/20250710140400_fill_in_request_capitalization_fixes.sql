-- Fill-in Request Happy Path — sentence-case capitalization + trailing periods.

update public.cells
set content =
  'Tutor supervisor team receives call off request and reviews tutor availabilities.'
where id = 'a0000000-0000-4000-8000-000000150107';

update public.cells
set content =
  'Tutor supervisor team requests fill in and fellow tutor sends message in #shift-swap Slack channel.'
where id = 'a0000000-0000-4000-8000-000000150204';

update public.cells
set content = 'Tutor receives request.'
where id = 'a0000000-0000-4000-8000-000000150203';

update public.cells
set content = 'Tutor confirms or denies fill in request.'
where id = 'a0000000-0000-4000-8000-000000150303';

update public.cells
set content =
  'Tutor supervisor team is notified on if tutor can fill in.'
where id = 'a0000000-0000-4000-8000-000000150304';

update public.cells
set content = 'Tutor accesses session if able to fill in.'
where id = 'a0000000-0000-4000-8000-000000150403';

update public.cells
set content =
  'Tutor supervisor team adds tutor to session if tutor confirms request.'
where id = 'a0000000-0000-4000-8000-000000150407';
