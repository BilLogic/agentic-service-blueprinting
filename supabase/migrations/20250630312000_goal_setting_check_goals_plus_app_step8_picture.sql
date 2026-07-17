-- Check Goals path — PLUS App step 8 screenshot

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor navigates back to the Your Students screen in the PLUS app to move on to the next student in the researcher sorted list.',
    'picture', '/blueprint-images/goal-setting/check-goals/plus-app/step-08-next-student.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000a00806';
