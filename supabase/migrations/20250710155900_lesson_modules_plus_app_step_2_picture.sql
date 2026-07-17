-- Lesson Modules Happy Path — PLUS App step 2 lesson questions screenshot.

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor works through the lesson questions in the PLUS app.',
    'picture', '/blueprint-images/lesson-modules/happy-path/plus-app/step-02-lesson-questions.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000120206';
