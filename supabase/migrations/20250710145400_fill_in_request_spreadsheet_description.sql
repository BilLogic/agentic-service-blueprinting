-- Fill-in Request step 1: update Back Stage Tech (Google Spreadsheet) description.

update public.cells
set
  description = 'The tutor''s session scheduling information is stored in a Google Spreadsheet.',
  links = jsonb_build_array(
    jsonb_build_object(
      'type', 'tech_description',
      'label', 'Google Spreadsheet',
      'description', 'The tutor''s session scheduling information is stored in a Google Spreadsheet.'
    )
  )
where id = 'a0000000-0000-4000-8000-000000150108';
