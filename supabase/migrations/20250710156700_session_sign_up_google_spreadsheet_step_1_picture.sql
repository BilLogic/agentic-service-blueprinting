-- Session Sign Up Happy Path — Google Spreadsheet step 1 logo.

update public.cells
set
  description = 'The tutor''s session scheduling information is stored in a Google Spreadsheet.',
  links = jsonb_build_array(
    jsonb_build_object(
      'type', 'tech_description',
      'label', 'Google Spreadsheet',
      'description', 'The tutor''s session scheduling information is stored in a Google Spreadsheet.',
      'picture', '/blueprint-images/shared/back-stage-tech/google-sheets-logo.png'
    )
  )
where id = 'a0000000-0000-4000-8000-000000130108';
