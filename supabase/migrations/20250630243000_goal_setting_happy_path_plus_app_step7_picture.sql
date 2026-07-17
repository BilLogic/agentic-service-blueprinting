-- Goal Setting happy path — PLUS App step 7 screenshot

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'picture', '/blueprint-images/goal-setting/happy-path/plus-app/step-07-your-students.png'
  )
)
where id = 'a0000000-0000-4000-8000-0000001a0706';
