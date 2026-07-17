-- Call-off Request step 2: update Shift Swap Google Form tech description.

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Shift Swap Google Form',
    'description', 'The tutor initiates a call off request via the Shift Swap Google Form when there is more than 12 hours before the session.',
    'picture', '/blueprint-images/shared/front-stage-tech/google-form-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000170206';
