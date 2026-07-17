-- Before Students Join Happy Path step 1 — update PLUS App Front Stage Tech description

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutors open the Session Detail page in the PLUS app to join the session.',
    'picture', '/blueprint-images/before-students-join/happy-path/plus-app/step-01-your-sessions.png',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=1687-169958&t=LvyyxUtQVUCLMMc2-1'
  )
)
where id = 'a0000000-0000-4000-8000-000000180106';
