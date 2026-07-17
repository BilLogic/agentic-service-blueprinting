-- Fill-in Request Happy Path — PLUS App step 4 Figma link.

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor supervisor team adds that tutor to the session in the PLUS app. Once added, the tutor accesses the session details in the PLUS app.',
    'picture', '/blueprint-images/fill-in-request/happy-path/plus-app/step-04-confirm-fill-in.png',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=2942-401328&t=NRQGuswXJmExM6wI-1'
  )
)
where id = 'a0000000-0000-4000-8000-000000150406';
