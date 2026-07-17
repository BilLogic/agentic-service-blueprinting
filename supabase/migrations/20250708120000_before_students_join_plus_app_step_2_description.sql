-- Before Students Join Happy Path step 2 — update PLUS App Front Stage Tech description

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutors join the Zoom/Pencil Page via the join session modal in the session dashboard.',
    'picture', '/blueprint-images/before-students-join/happy-path/plus-app/step-02-session-detail.png',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=5486-76055&t=LvyyxUtQVUCLMMc2-1'
  )
)
where id = 'a0000000-0000-4000-8000-000000180206';
