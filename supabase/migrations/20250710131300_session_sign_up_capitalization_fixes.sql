-- Session Sign Up — sentence-case capitalization + trailing periods.

update public.cells
set content = 'Dev team takes that scheduling info and stores it in a Google Spreadsheet.'
where id = 'a0000000-0000-4000-8000-000000130107';

update public.cells
set content = E'Dev team\nDesign team'
where id = 'a0000000-0000-4000-8000-000000130109';

update public.cells
set description =
  'The Dev team builds the PLUS app features for opening onboarding modules, and the Design team creates the screens and flows for that experience.'
where id = 'a0000000-0000-4000-8000-000000130109';

update public.cells
set content =
  'Tutor supervisor team receives and reviews Google Spreadsheet from Dev team.'
where id = 'a0000000-0000-4000-8000-000000130207';
