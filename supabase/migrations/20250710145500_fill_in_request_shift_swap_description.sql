-- Fill-in Request step 1: update Shift Swap Google Form tech description.

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Shift Swap Google Form',
    'description', 'The call-off request is initiated through the Shift Swap Google Form, which lets the tutor supervisor team know they need to find coverage for that session.',
    'picture', '/blueprint-images/shared/front-stage-tech/google-form-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000150106';
