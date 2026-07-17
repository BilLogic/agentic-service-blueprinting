-- Wrap-Up Happy Path — update PLUS App step 4 Figma link.

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor completes the reflection form in the PLUS app after the session.',
    'picture', '/blueprint-images/wrap-up/happy-path/plus-app/step-04-reflection-form.png',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=563-296430&t=XKhgzk0ZQ9Na4Nqs-1'
  )
)
where id = 'a0000000-0000-4000-8000-0000001c0406';
