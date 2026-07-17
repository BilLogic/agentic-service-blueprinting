-- Session Sign Up step 1: Front Stage Tech / Back Stage Tech descriptions.

update public.cells
set
  description = 'The tutor signs up for recurring sessions for the rest of the semester in the PLUS app.',
  links = jsonb_build_array(
    jsonb_build_object(
      'type', 'tech_description',
      'label', 'PLUS app',
      'description', 'The tutor signs up for recurring sessions for the rest of the semester in the PLUS app.'
    )
  )
where id = 'a0000000-0000-4000-8000-000000130106';

update public.cells
set
  description = 'The tutor''s recurring session scheduling information is stored in a Google Spreadsheet.',
  links = jsonb_build_array(
    jsonb_build_object(
      'type', 'tech_description',
      'label', 'Google Spreadsheet',
      'description', 'The tutor''s recurring session scheduling information is stored in a Google Spreadsheet.'
    )
  )
where id = 'a0000000-0000-4000-8000-000000130108';
