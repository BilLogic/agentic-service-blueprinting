-- Standard Scheduling Happy Path — tech pill descriptions.

update public.cells
set
  description = 'The tutor supervisor team reviews tutor schedules stored in a Google Spreadsheet from the Dev Team.',
  links = jsonb_build_array(
    jsonb_build_object(
      'type', 'tech_description',
      'label', 'Google Spreadsheet',
      'description', 'The tutor supervisor team reviews tutor schedules stored in a Google Spreadsheet from the Dev Team.'
    )
  )
where id = 'a0000000-0000-4000-8000-000000140108';

update public.cells
set
  description = 'The tutor supervisor team sends the semester schedule to tutors through the PLUS app.',
  links = jsonb_build_array(
    jsonb_build_object(
      'type', 'tech_description',
      'label', 'PLUS App',
      'description', 'The tutor supervisor team sends the semester schedule to tutors through the PLUS app.'
    )
  )
where id = 'a0000000-0000-4000-8000-000000140206';
