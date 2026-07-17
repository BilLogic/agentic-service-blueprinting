-- Standard Scheduling Happy Path — Support Actions descriptions.

update public.cells
set description =
  'The Dev Team stores tutor schedules in a Google Spreadsheet for the tutor supervisor team to review.'
where id = 'a0000000-0000-4000-8000-000000140109';

update public.cells
set description =
  'The Dev Team builds the PLUS app features for sending semester schedules, and the Design Team creates the screens and flows for that experience.'
where id = 'a0000000-0000-4000-8000-000000140209';
