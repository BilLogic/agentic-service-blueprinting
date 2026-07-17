-- Onboarding → Onboarding Modules scenario — Happy Path
-- Stable keys map to fixed UUIDs in src/data/onboardingModulesHappyPathFallback.ts

insert into public.paths (id, service_scenario_id, name, description, path_type)
values (
  'a0000000-0000-4000-8000-000000007201',
  'a0000000-0000-4000-8000-000000000123',
  'Happy Path',
  'Tutor completes onboarding modules.',
  'happy'
)
on conflict (id) do update set
  service_scenario_id = excluded.service_scenario_id,
  name = excluded.name,
  description = excluded.description,
  path_type = excluded.path_type;

delete from public.cell_triggers
where source_cell_id in (
  select id from public.cells
  where path_id = 'a0000000-0000-4000-8000-000000007201'
);

delete from public.cells
where path_id = 'a0000000-0000-4000-8000-000000007201';

delete from public.layers
where path_id = 'a0000000-0000-4000-8000-000000007201';

insert into public.layers (id, path_id, name, row_position)
values
  (
    'a0000000-0000-4000-8000-000000000828',
    'a0000000-0000-4000-8000-000000007201',
    'Visual',
    0
  ),
  (
    'a0000000-0000-4000-8000-000000000841',
    'a0000000-0000-4000-8000-000000007201',
    'Regular Tutor',
    1
  ),
  (
    'a0000000-0000-4000-8000-000000000843',
    'a0000000-0000-4000-8000-000000007201',
    'Front Stage Tech',
    2
  ),
  (
    'a0000000-0000-4000-8000-000000000842',
    'a0000000-0000-4000-8000-000000007201',
    'Front Stage Actions',
    3
  ),
  (
    'a0000000-0000-4000-8000-000000000845',
    'a0000000-0000-4000-8000-000000007201',
    'Back Stage Tech',
    4
  ),
  (
    'a0000000-0000-4000-8000-000000000844',
    'a0000000-0000-4000-8000-000000007201',
    'Back Stage Actions',
    5
  ),
  (
    'a0000000-0000-4000-8000-000000000846',
    'a0000000-0000-4000-8000-000000007201',
    'Support Actions',
    6
  )
on conflict (id) do update set
  name = excluded.name,
  row_position = excluded.row_position,
  path_id = excluded.path_id;

insert into public.steps (id, service_scenario_id, name)
values
  (
    'a0000000-0000-4000-8000-000000000851',
    'a0000000-0000-4000-8000-000000000123',
    'Module opening'
  ),
  (
    'a0000000-0000-4000-8000-000000000852',
    'a0000000-0000-4000-8000-000000000123',
    'Accessing content'
  ),
  (
    'a0000000-0000-4000-8000-000000000853',
    'a0000000-0000-4000-8000-000000000123',
    'Reading lesson'
  ),
  (
    'a0000000-0000-4000-8000-000000000854',
    'a0000000-0000-4000-8000-000000000123',
    'Supplementary materials'
  ),
  (
    'a0000000-0000-4000-8000-000000000855',
    'a0000000-0000-4000-8000-000000000123',
    'Quiz completion'
  ),
  (
    'a0000000-0000-4000-8000-000000000856',
    'a0000000-0000-4000-8000-000000000123',
    'Reflection'
  ),
  (
    'a0000000-0000-4000-8000-000000000857',
    'a0000000-0000-4000-8000-000000000123',
    'Module completion'
  )
on conflict (id) do update set
  name = excluded.name,
  service_scenario_id = excluded.service_scenario_id;

insert into public.path_steps (path_id, step_id, column_position)
values
  ('a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000851', 1),
  ('a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000852', 2),
  ('a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000853', 3),
  ('a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000854', 4),
  ('a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000855', 5),
  ('a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000856', 6),
  ('a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000857', 7)
on conflict (path_id, step_id) do update set
  column_position = excluded.column_position;

insert into public.cells (id, path_id, layer_id, step_id, content)
values
  ('a0000000-0000-4000-8000-000000110110', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000828', 'a0000000-0000-4000-8000-000000000851', ''),
  ('a0000000-0000-4000-8000-000000110210', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000828', 'a0000000-0000-4000-8000-000000000852', ''),
  ('a0000000-0000-4000-8000-000000110310', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000828', 'a0000000-0000-4000-8000-000000000853', ''),
  ('a0000000-0000-4000-8000-000000110410', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000828', 'a0000000-0000-4000-8000-000000000854', ''),
  ('a0000000-0000-4000-8000-000000110510', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000828', 'a0000000-0000-4000-8000-000000000855', ''),
  ('a0000000-0000-4000-8000-000000110610', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000828', 'a0000000-0000-4000-8000-000000000856', ''),
  ('a0000000-0000-4000-8000-000000110710', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000828', 'a0000000-0000-4000-8000-000000000857', ''),

  ('a0000000-0000-4000-8000-000000110103', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000841', 'a0000000-0000-4000-8000-000000000851', 'Opens next uncompleted onboarding module.'),
  ('a0000000-0000-4000-8000-000000110106', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000843', 'a0000000-0000-4000-8000-000000000851', 'PLUS App'),
  ('a0000000-0000-4000-8000-000000110109', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000846', 'a0000000-0000-4000-8000-000000000851', E'Dev Team\nDesign Team'),

  ('a0000000-0000-4000-8000-000000110203', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000841', 'a0000000-0000-4000-8000-000000000852', 'Follows Notion link in individual module page.'),
  ('a0000000-0000-4000-8000-000000110206', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000843', 'a0000000-0000-4000-8000-000000000852', E'PLUS App\nNotion'),
  ('a0000000-0000-4000-8000-000000110209', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000846', 'a0000000-0000-4000-8000-000000000852', E'Dev Team\nDesign Team'),

  ('a0000000-0000-4000-8000-000000110303', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000841', 'a0000000-0000-4000-8000-000000000853', 'Reads through the onboarding module lesson.'),
  ('a0000000-0000-4000-8000-000000110306', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000843', 'a0000000-0000-4000-8000-000000000853', 'Notion'),
  ('a0000000-0000-4000-8000-000000110307', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000844', 'a0000000-0000-4000-8000-000000000853', 'The instructional design team creates and maintains the lesson modules.'),
  ('a0000000-0000-4000-8000-000000110309', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000846', 'a0000000-0000-4000-8000-000000000853', 'Researchers help guide instructional implementation.'),

  ('a0000000-0000-4000-8000-000000110403', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000841', 'a0000000-0000-4000-8000-000000000854', 'Reads through any supplementary materials in the lesson.'),
  ('a0000000-0000-4000-8000-000000110406', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000843', 'a0000000-0000-4000-8000-000000000854', E'Notion\nGoogle Docs/ Slides'),
  ('a0000000-0000-4000-8000-000000110407', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000844', 'a0000000-0000-4000-8000-000000000854', 'The instructional design team maintains the supplementary materials.'),
  ('a0000000-0000-4000-8000-000000110409', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000846', 'a0000000-0000-4000-8000-000000000854', 'Researchers help guide instructional implementation.'),

  ('a0000000-0000-4000-8000-000000110503', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000841', 'a0000000-0000-4000-8000-000000000855', 'Completes Google quiz.'),
  ('a0000000-0000-4000-8000-000000110506', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000843', 'a0000000-0000-4000-8000-000000000855', 'Google Quiz embedded in Notion'),
  ('a0000000-0000-4000-8000-000000110507', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000844', 'a0000000-0000-4000-8000-000000000855', 'The instructional design team creates and maintains the Google quiz.'),
  ('a0000000-0000-4000-8000-000000110509', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000846', 'a0000000-0000-4000-8000-000000000855', 'Researchers help guide instructional implementation.'),

  ('a0000000-0000-4000-8000-000000110603', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000841', 'a0000000-0000-4000-8000-000000000856', 'Fills out reflection for module.'),
  ('a0000000-0000-4000-8000-000000110606', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000843', 'a0000000-0000-4000-8000-000000000856', 'PLUS App'),
  ('a0000000-0000-4000-8000-000000110607', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000844', 'a0000000-0000-4000-8000-000000000856', 'Instructional design team designs and maintains reflection questions.'),
  ('a0000000-0000-4000-8000-000000110608', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000845', 'a0000000-0000-4000-8000-000000000856', 'Notion'),
  ('a0000000-0000-4000-8000-000000110609', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000846', 'a0000000-0000-4000-8000-000000000856', E'Researchers help guide instructional implementation.\nDev Team\nDesign Team'),

  ('a0000000-0000-4000-8000-000000110703', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000841', 'a0000000-0000-4000-8000-000000000857', 'Submits reflection questions and completes module.'),
  ('a0000000-0000-4000-8000-000000110706', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000843', 'a0000000-0000-4000-8000-000000000857', 'PLUS App'),
  ('a0000000-0000-4000-8000-000000110709', 'a0000000-0000-4000-8000-000000007201', 'a0000000-0000-4000-8000-000000000846', 'a0000000-0000-4000-8000-000000000857', E'Dev Team\nDesign Team')
on conflict (id) do update set
  path_id = excluded.path_id,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id,
  content = excluded.content;

delete from public.cell_triggers
where id in (
  select id from public.cell_triggers
  where source_cell_id in (
    select id from public.cells
    where path_id = 'a0000000-0000-4000-8000-000000007201'
  )
);

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  ('a0000000-0000-4000-8000-000000089001', 'a0000000-0000-4000-8000-000000110103', 'a0000000-0000-4000-8000-000000110106'),
  ('a0000000-0000-4000-8000-000000089002', 'a0000000-0000-4000-8000-000000110203', 'a0000000-0000-4000-8000-000000110206'),
  ('a0000000-0000-4000-8000-000000089003', 'a0000000-0000-4000-8000-000000110303', 'a0000000-0000-4000-8000-000000110306'),
  ('a0000000-0000-4000-8000-000000089004', 'a0000000-0000-4000-8000-000000110403', 'a0000000-0000-4000-8000-000000110406'),
  ('a0000000-0000-4000-8000-000000089005', 'a0000000-0000-4000-8000-000000110503', 'a0000000-0000-4000-8000-000000110506'),
  ('a0000000-0000-4000-8000-000000089006', 'a0000000-0000-4000-8000-000000110603', 'a0000000-0000-4000-8000-000000110606'),
  ('a0000000-0000-4000-8000-000000089007', 'a0000000-0000-4000-8000-000000110703', 'a0000000-0000-4000-8000-000000110706'),
  ('a0000000-0000-4000-8000-000000089011', 'a0000000-0000-4000-8000-000000110103', 'a0000000-0000-4000-8000-000000110203'),
  ('a0000000-0000-4000-8000-000000089012', 'a0000000-0000-4000-8000-000000110203', 'a0000000-0000-4000-8000-000000110303'),
  ('a0000000-0000-4000-8000-000000089013', 'a0000000-0000-4000-8000-000000110303', 'a0000000-0000-4000-8000-000000110403'),
  ('a0000000-0000-4000-8000-000000089014', 'a0000000-0000-4000-8000-000000110403', 'a0000000-0000-4000-8000-000000110503'),
  ('a0000000-0000-4000-8000-000000089015', 'a0000000-0000-4000-8000-000000110503', 'a0000000-0000-4000-8000-000000110603'),
  ('a0000000-0000-4000-8000-000000089017', 'a0000000-0000-4000-8000-000000110603', 'a0000000-0000-4000-8000-000000110703'),
  ('a0000000-0000-4000-8000-000000089016', 'a0000000-0000-4000-8000-000000110703', 'a0000000-0000-4000-8000-000000110103'),
  ('a0000000-0000-4000-8000-000000089031', 'a0000000-0000-4000-8000-000000110307', 'a0000000-0000-4000-8000-000000110306'),
  ('a0000000-0000-4000-8000-000000089041', 'a0000000-0000-4000-8000-000000110407', 'a0000000-0000-4000-8000-000000110406'),
  ('a0000000-0000-4000-8000-000000089051', 'a0000000-0000-4000-8000-000000110506', 'a0000000-0000-4000-8000-000000110507'),
  ('a0000000-0000-4000-8000-000000089052', 'a0000000-0000-4000-8000-000000110507', 'a0000000-0000-4000-8000-000000110506'),
  ('a0000000-0000-4000-8000-000000089063', 'a0000000-0000-4000-8000-000000110607', 'a0000000-0000-4000-8000-000000110608'),
  ('a0000000-0000-4000-8000-000000089064', 'a0000000-0000-4000-8000-000000110608', 'a0000000-0000-4000-8000-000000110606')
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor opens the PLUS app and starts the next uncompleted onboarding module.',
    'picture', '/blueprint-images/onboarding-modules/happy-path/plus-app/step-01-module-opening.png',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=3385-292709&t=Fyqmb2RX2B0cj9sv-1'
  )
)
where id = 'a0000000-0000-4000-8000-000000110106';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor finds the link to the onboarding module content that exists on Notion on the individual module page in the PLUS app.',
    'picture', '/blueprint-images/onboarding-modules/happy-path/plus-app/step-02-accessing-content.png',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=3385-292712&t=Fyqmb2RX2B0cj9sv-1'
  ),
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Notion',
    'description', 'The tutor follows the Notion link from the PLUS app to begin reading the onboarding module content.',
    'picture', '/blueprint-images/shared/back-stage-tech/notion-logo.png',
    'pictures', jsonb_build_array(
      '/blueprint-images/shared/back-stage-tech/notion-logo.png',
      '/blueprint-images/onboarding-modules/happy-path/notion/step-02-open-module-button.png'
    )
  )
)
where id = 'a0000000-0000-4000-8000-000000110206';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Notion',
    'description', 'The tutor reads through the onboarding module content in Notion.',
    'picture', '/blueprint-images/onboarding-modules/happy-path/notion/step-03-reading-lesson.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000110306';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Notion',
    'description', 'The tutor reviews supplementary materials linked from the Notion module content.',
    'picture', '/blueprint-images/shared/back-stage-tech/notion-logo.png'
  ),
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Google Docs/ Slides',
    'description', 'The tutor opens any Google Docs or Slides linked as supplementary materials for the module content.',
    'picture', '/blueprint-images/onboarding-modules/happy-path/google-docs/step-04-supplementary-materials.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000110406';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Google Quiz embedded in Notion',
    'description', 'The tutor completes the Google Quiz embedded in the Notion module to check their understanding.',
    'picture', '/blueprint-images/onboarding-modules/happy-path/google-quiz/step-05-module-quiz.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000110506';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor fills out the module reflection questions in the PLUS app.',
    'picture', '/blueprint-images/onboarding-modules/happy-path/plus-app/step-06-reflection.png',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=3385-292711&t=Fyqmb2RX2B0cj9sv-1'
  )
)
where id = 'a0000000-0000-4000-8000-000000110606';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Notion',
    'description', 'The instructional design team uses Notion to design and maintain the reflection questions for the module.',
    'picture', '/blueprint-images/shared/back-stage-tech/notion-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000110608';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor submits the reflection questions and completes the onboarding module in the PLUS app.',
    'picture', '/blueprint-images/onboarding-modules/happy-path/plus-app/step-07-module-completion.png',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=3385-292713&t=Fyqmb2RX2B0cj9sv-1'
  )
)
where id = 'a0000000-0000-4000-8000-000000110706';

update public.cells
set description = 'The Dev Team builds the PLUS app features onboarding modules, and the Design Team creates the screens and flows for that experience.'
where id in (
  'a0000000-0000-4000-8000-000000110109',
  'a0000000-0000-4000-8000-000000110209',
  'a0000000-0000-4000-8000-000000110709'
);

update public.cells
set description = 'Researchers help guide how onboarding content is designed and delivered so tutors learn effectively.'
where id in (
  'a0000000-0000-4000-8000-000000110309',
  'a0000000-0000-4000-8000-000000110409',
  'a0000000-0000-4000-8000-000000110509'
);

update public.cells
set
  links = '[]'::jsonb,
  description = E'Researchers help guide how onboarding content is designed and delivered so tutors learn effectively.\n\nThe Dev Team builds the PLUS app features for onboarding modules, and the Design Team creates the screens and flows for that experience.'
where id = 'a0000000-0000-4000-8000-000000110609';

update public.cells
set picture = '/blueprint-images/onboarding-modules/happy-path/regular-tutor/step-01-opens-module.png'
where id = 'a0000000-0000-4000-8000-000000110103';

update public.cells
set picture = '/blueprint-images/onboarding-modules/happy-path/regular-tutor/step-02-follows-notion-link.png'
where id = 'a0000000-0000-4000-8000-000000110203';

update public.cells
set picture = '/blueprint-images/onboarding-modules/happy-path/regular-tutor/step-03-reads-lesson.png'
where id = 'a0000000-0000-4000-8000-000000110303';

update public.cells
set picture = '/blueprint-images/onboarding-modules/happy-path/regular-tutor/step-04-supplementary-materials.png'
where id = 'a0000000-0000-4000-8000-000000110403';

update public.cells
set picture = '/blueprint-images/onboarding-modules/happy-path/regular-tutor/step-05-completes-quiz.png'
where id = 'a0000000-0000-4000-8000-000000110503';

update public.cells
set picture = '/blueprint-images/onboarding-modules/happy-path/regular-tutor/step-06-reflection.png'
where id = 'a0000000-0000-4000-8000-000000110603';

update public.cells
set picture = '/blueprint-images/onboarding-modules/happy-path/regular-tutor/step-07-module-completion.png'
where id = 'a0000000-0000-4000-8000-000000110703';
