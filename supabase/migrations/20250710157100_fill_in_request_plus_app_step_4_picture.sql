-- Fill-in Request Happy Path — PLUS App step 4 confirm fill-in screenshot.

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor supervisor team adds that tutor to the session in the PLUS app. Once added, the tutor accesses the session details in the PLUS app.',
    'picture', '/blueprint-images/fill-in-request/happy-path/plus-app/step-04-confirm-fill-in.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000150406';
