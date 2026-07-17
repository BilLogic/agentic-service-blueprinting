-- Check Goals path — PLUS App step 2 screenshot

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor views the Your Students screen in the PLUS app and clicks the Check Goals CTA in the Action column for the student they are working with.',
    'picture', '/blueprint-images/goal-setting/check-goals/plus-app/step-02-check-goals-cta.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000a00206';
