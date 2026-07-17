-- Call-off Request step 5: update Support Actions description.

update public.cells
set description =
  'The Dev Team stores tutor schedules in a Google Spreadsheet for the tutor supervisor team to review.'
where id = 'a0000000-0000-4000-8000-000000170509';
