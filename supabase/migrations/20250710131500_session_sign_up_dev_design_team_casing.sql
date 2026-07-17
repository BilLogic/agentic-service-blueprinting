-- Session Sign Up: restore Dev Team / Design Team capitalization.

update public.cells
set content = E'Dev Team\nDesign Team'
where id = 'a0000000-0000-4000-8000-000000130109';

update public.cells
set description =
  'The Dev Team builds the PLUS app features for opening onboarding modules, and the Design Team creates the screens and flows for that experience.'
where id = 'a0000000-0000-4000-8000-000000130109';

update public.cells
set content =
  'Dev Team takes that scheduling info and stores it in a Google Spreadsheet.'
where id = 'a0000000-0000-4000-8000-000000130107';

update public.cells
set content =
  'Tutor supervisor team receives and reviews Google Spreadsheet from Dev Team.'
where id = 'a0000000-0000-4000-8000-000000130207';
