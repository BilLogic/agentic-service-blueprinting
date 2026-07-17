-- Application → Discovery scenario — Happy Path
-- Stable keys map to fixed UUIDs in src/data/applicationHappyPathFallback.ts

insert into public.paths (id, service_scenario_id, name, description, path_type)
values (
  'a0000000-0000-4000-8000-000000000700',
  'a0000000-0000-4000-8000-000000000121',
  'Happy Path',
  'Potential tutors discover and want to join PLUS.',
  'happy'
)
on conflict (id) do update set
  service_scenario_id = excluded.service_scenario_id,
  name = excluded.name,
  description = excluded.description,
  path_type = excluded.path_type;

insert into public.layers (id, path_id, name, row_position)
values
  (
    'a0000000-0000-4000-8000-000000000710',
    'a0000000-0000-4000-8000-000000000700',
    'Visual',
    0
  ),
  (
    'a0000000-0000-4000-8000-000000000703',
    'a0000000-0000-4000-8000-000000000700',
    'Regular Tutor',
    1
  ),
  (
    'a0000000-0000-4000-8000-000000000706',
    'a0000000-0000-4000-8000-000000000700',
    'Front Stage Tech',
    2
  ),
  (
    'a0000000-0000-4000-8000-000000000704',
    'a0000000-0000-4000-8000-000000000700',
    'Front Stage Actions',
    3
  ),
  (
    'a0000000-0000-4000-8000-000000000708',
    'a0000000-0000-4000-8000-000000000700',
    'Back Stage Tech',
    4
  ),
  (
    'a0000000-0000-4000-8000-000000000707',
    'a0000000-0000-4000-8000-000000000700',
    'Back Stage Actions',
    5
  ),
  (
    'a0000000-0000-4000-8000-000000000709',
    'a0000000-0000-4000-8000-000000000700',
    'Support Actions',
    6
  )
on conflict (id) do update set
  name = excluded.name,
  row_position = excluded.row_position;

insert into public.steps (id, service_scenario_id, name)
values
  (
    'a0000000-0000-4000-8000-000000000711',
    'a0000000-0000-4000-8000-000000000121',
    'Discovers PLUS'
  ),
  (
    'a0000000-0000-4000-8000-000000000712',
    'a0000000-0000-4000-8000-000000000121',
    'Discovers PLUS'
  ),
  (
    'a0000000-0000-4000-8000-000000000713',
    'a0000000-0000-4000-8000-000000000121',
    'Discovers PLUS'
  ),
  (
    'a0000000-0000-4000-8000-000000000714',
    'a0000000-0000-4000-8000-000000000121',
    'Discovers PLUS'
  ),
  (
    'a0000000-0000-4000-8000-000000000715',
    'a0000000-0000-4000-8000-000000000121',
    'Discovers PLUS'
  ),
  (
    'a0000000-0000-4000-8000-000000000716',
    'a0000000-0000-4000-8000-000000000121',
    'Interested in joining PLUS'
  ),
  (
    'a0000000-0000-4000-8000-000000000717',
    'a0000000-0000-4000-8000-000000000121',
    'Not interested in joining PLUS'
  )
on conflict (id) do update set
  name = excluded.name,
  service_scenario_id = excluded.service_scenario_id;

insert into public.path_steps (path_id, step_id, column_position)
values
  ('a0000000-0000-4000-8000-000000000700', 'a0000000-0000-4000-8000-000000000711', 1),
  ('a0000000-0000-4000-8000-000000000700', 'a0000000-0000-4000-8000-000000000712', 2),
  ('a0000000-0000-4000-8000-000000000700', 'a0000000-0000-4000-8000-000000000713', 3),
  ('a0000000-0000-4000-8000-000000000700', 'a0000000-0000-4000-8000-000000000714', 4),
  ('a0000000-0000-4000-8000-000000000700', 'a0000000-0000-4000-8000-000000000715', 5),
  ('a0000000-0000-4000-8000-000000000700', 'a0000000-0000-4000-8000-000000000716', 6)
on conflict (path_id, step_id) do update set
  column_position = excluded.column_position;

insert into public.cells (id, path_id, layer_id, step_id, content)
values
  -- Visual row
  ('a0000000-0000-4000-8000-000000070110', 'a0000000-0000-4000-8000-000000000700', 'a0000000-0000-4000-8000-000000000710', 'a0000000-0000-4000-8000-000000000711', ''),
  ('a0000000-0000-4000-8000-000000070210', 'a0000000-0000-4000-8000-000000000700', 'a0000000-0000-4000-8000-000000000710', 'a0000000-0000-4000-8000-000000000712', ''),
  ('a0000000-0000-4000-8000-000000070310', 'a0000000-0000-4000-8000-000000000700', 'a0000000-0000-4000-8000-000000000710', 'a0000000-0000-4000-8000-000000000713', ''),
  ('a0000000-0000-4000-8000-000000070410', 'a0000000-0000-4000-8000-000000000700', 'a0000000-0000-4000-8000-000000000710', 'a0000000-0000-4000-8000-000000000714', ''),
  ('a0000000-0000-4000-8000-000000070510', 'a0000000-0000-4000-8000-000000000700', 'a0000000-0000-4000-8000-000000000710', 'a0000000-0000-4000-8000-000000000715', ''),
  ('a0000000-0000-4000-8000-000000070610', 'a0000000-0000-4000-8000-000000000700', 'a0000000-0000-4000-8000-000000000710', 'a0000000-0000-4000-8000-000000000716', ''),
  -- Step 1 — word of mouth
  ('a0000000-0000-4000-8000-000000070103', 'a0000000-0000-4000-8000-000000000700', 'a0000000-0000-4000-8000-000000000703', 'a0000000-0000-4000-8000-000000000711', 'Discovers PLUS via word of mouth.'),
  ('a0000000-0000-4000-8000-000000070104', 'a0000000-0000-4000-8000-000000000700', 'a0000000-0000-4000-8000-000000000704', 'a0000000-0000-4000-8000-000000000711', 'Previous or current PLUS tutor might have informed about PLUS.'),
  -- Step 2 — Social Media
  ('a0000000-0000-4000-8000-000000070203', 'a0000000-0000-4000-8000-000000000700', 'a0000000-0000-4000-8000-000000000703', 'a0000000-0000-4000-8000-000000000712', 'Discovers PLUS via social media.'),
  ('a0000000-0000-4000-8000-000000070206', 'a0000000-0000-4000-8000-000000000700', 'a0000000-0000-4000-8000-000000000706', 'a0000000-0000-4000-8000-000000000712', 'Social Media'),
  ('a0000000-0000-4000-8000-000000070207', 'a0000000-0000-4000-8000-000000000700', 'a0000000-0000-4000-8000-000000000707', 'a0000000-0000-4000-8000-000000000712', 'Marketing team creates social media posts and manages social platforms.'),
  ('a0000000-0000-4000-8000-000000070208', 'a0000000-0000-4000-8000-000000000700', 'a0000000-0000-4000-8000-000000000708', 'a0000000-0000-4000-8000-000000000712', 'Figma'),
  ('a0000000-0000-4000-8000-000000070209', 'a0000000-0000-4000-8000-000000000700', 'a0000000-0000-4000-8000-000000000709', 'a0000000-0000-4000-8000-000000000712', 'Branding Guidelines'),
  -- Step 3 — Marketing Website
  ('a0000000-0000-4000-8000-000000070303', 'a0000000-0000-4000-8000-000000000700', 'a0000000-0000-4000-8000-000000000703', 'a0000000-0000-4000-8000-000000000713', 'Discovers PLUS via PLUS marketing website.'),
  ('a0000000-0000-4000-8000-000000070306', 'a0000000-0000-4000-8000-000000000700', 'a0000000-0000-4000-8000-000000000706', 'a0000000-0000-4000-8000-000000000713', 'Marketing Website'),
  ('a0000000-0000-4000-8000-000000070307', 'a0000000-0000-4000-8000-000000000700', 'a0000000-0000-4000-8000-000000000707', 'a0000000-0000-4000-8000-000000000713', 'Design team manages content and messaging on the website. Dev team implements website into code.'),
  ('a0000000-0000-4000-8000-000000070308', 'a0000000-0000-4000-8000-000000000700', 'a0000000-0000-4000-8000-000000000708', 'a0000000-0000-4000-8000-000000000713', E'Figma\nDev Tools'),
  ('a0000000-0000-4000-8000-000000070309', 'a0000000-0000-4000-8000-000000000700', 'a0000000-0000-4000-8000-000000000709', 'a0000000-0000-4000-8000-000000000713', 'Branding Guidelines, Design System'),
  -- Step 4 — On-campus job fair
  ('a0000000-0000-4000-8000-000000070403', 'a0000000-0000-4000-8000-000000000700', 'a0000000-0000-4000-8000-000000000703', 'a0000000-0000-4000-8000-000000000714', 'Discovers PLUS via on campus activities.'),
  ('a0000000-0000-4000-8000-000000070404', 'a0000000-0000-4000-8000-000000000700', 'a0000000-0000-4000-8000-000000000704', 'a0000000-0000-4000-8000-000000000714', 'Tutor supervisor team meets prospective tutors at on-campus job fair.'),
  ('a0000000-0000-4000-8000-000000070406', 'a0000000-0000-4000-8000-000000000700', 'a0000000-0000-4000-8000-000000000706', 'a0000000-0000-4000-8000-000000000714', E'Posters\nOn-campus booth'),
  -- Step 5 — Handshake
  ('a0000000-0000-4000-8000-000000070503', 'a0000000-0000-4000-8000-000000000700', 'a0000000-0000-4000-8000-000000000703', 'a0000000-0000-4000-8000-000000000715', 'Discovers PLUS via Handshake.'),
  ('a0000000-0000-4000-8000-000000070506', 'a0000000-0000-4000-8000-000000000700', 'a0000000-0000-4000-8000-000000000706', 'a0000000-0000-4000-8000-000000000715', 'Handshake'),
  ('a0000000-0000-4000-8000-000000070507', 'a0000000-0000-4000-8000-000000000700', 'a0000000-0000-4000-8000-000000000707', 'a0000000-0000-4000-8000-000000000715', 'Tutor supervisor team posts job openings on Handshake.'),
  ('a0000000-0000-4000-8000-000000070508', 'a0000000-0000-4000-8000-000000000700', 'a0000000-0000-4000-8000-000000000708', 'a0000000-0000-4000-8000-000000000715', 'Handshake Employer Profile'),
  -- Step 6 — Interested in joining PLUS
  ('a0000000-0000-4000-8000-000000070603', 'a0000000-0000-4000-8000-000000000700', 'a0000000-0000-4000-8000-000000000703', 'a0000000-0000-4000-8000-000000000716', 'Interested in joining PLUS.')
on conflict (id) do update set
  content = excluded.content,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id;

update public.cells
set picture = '/blueprint-images/application-discovery/happy-path/regular-tutor/step-01-word-of-mouth.png'
where id = 'a0000000-0000-4000-8000-000000070103';

update public.cells
set picture = '/blueprint-images/application-discovery/happy-path/regular-tutor/step-02-social-media.png'
where id = 'a0000000-0000-4000-8000-000000070203';

update public.cells
set picture = '/blueprint-images/application-discovery/happy-path/regular-tutor/step-03-marketing-website.png'
where id = 'a0000000-0000-4000-8000-000000070303';

update public.cells
set picture = '/blueprint-images/application-discovery/happy-path/regular-tutor/step-04-on-campus-job-fair.png'
where id = 'a0000000-0000-4000-8000-000000070403';

update public.cells
set picture = '/blueprint-images/application-discovery/happy-path/regular-tutor/step-05-handshake.png'
where id = 'a0000000-0000-4000-8000-000000070503';

update public.cells
set picture = '/blueprint-images/application-discovery/happy-path/regular-tutor/step-06-interested-in-joining-plus.png'
where id = 'a0000000-0000-4000-8000-000000070603';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Social Media',
    'description', 'Potential tutors discover PLUS through social posts on platforms like Instagram, LinkedIn, and similar channels where the marketing team shares recruiting content.',
    'picture', '/blueprint-images/application-discovery/happy-path/front-stage-tech/step-02-social-media.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000070206';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Figma',
    'description', 'The marketing team uses Figma to design social graphics and post layouts before publishing PLUS content to social platforms.',
    'picture', '/blueprint-images/shared/back-stage-tech/figma-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000070208';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Branding Guidelines',
    'description', 'Branding Guidelines are followed by the marketing team to keep PLUS social content visually and tonally consistent.'
  )
)
where id = 'a0000000-0000-4000-8000-000000070209';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Marketing Website',
    'description', 'Potential tutors visit the marketing website to learn about PLUS, understand the tutor role, and find a path to apply.',
    'picture', '/blueprint-images/application-discovery/happy-path/front-stage-tech/step-03-marketing-website.png'
  ),
  jsonb_build_object(
    'type', 'url',
    'label', 'Visit marketing website',
    'url', 'https://www.tutors.plus/'
  )
)
where id = 'a0000000-0000-4000-8000-000000070306';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Figma',
    'description', 'The design team uses Figma to create website layouts, content, and visuals that define how PLUS is presented on the marketing site.',
    'picture', '/blueprint-images/shared/back-stage-tech/figma-logo.png'
  ),
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Dev Tools',
    'description', 'The dev team uses development tools to build and update the marketing website from approved Figma designs.'
  )
)
where id = 'a0000000-0000-4000-8000-000000070308';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Branding Guidelines',
    'description', 'Branding Guidelines are followed by the marketing team to keep PLUS social content visually and tonally consistent.'
  ),
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Design System',
    'description', 'The design system is used by the marketing team to keep the marketing website visually consistent.'
  )
)
where id = 'a0000000-0000-4000-8000-000000070309';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Posters',
    'description', 'Printed posters on campus promote PLUS tutoring opportunities.'
  ),
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'On-campus booth',
    'description', 'A physical booth at on-campus job fairs where the tutor supervisor team meets prospective tutors, answers questions, and shares information about joining PLUS.',
    'picture', '/blueprint-images/application-discovery/happy-path/front-stage-tech/step-04-on-campus-booth.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000070406';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Handshake',
    'description', 'Potential tutors discover PLUS on Handshake and browse open job postings.',
    'picture', '/blueprint-images/application-discovery/happy-path/front-stage-tech/step-05-handshake.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000070506';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Handshake Employer Profile',
    'description', 'The tutor supervisor team manages the PLUS employer profile on Handshake, where job postings are published and kept up to date for student applicants.',
    'picture', '/blueprint-images/application-discovery/happy-path/front-stage-tech/step-05-handshake.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000070508';

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  ('a0000000-0000-4000-8000-000000078001', 'a0000000-0000-4000-8000-000000070104', 'a0000000-0000-4000-8000-000000070103'),
  ('a0000000-0000-4000-8000-000000078002', 'a0000000-0000-4000-8000-000000070207', 'a0000000-0000-4000-8000-000000070208'),
  ('a0000000-0000-4000-8000-000000078016', 'a0000000-0000-4000-8000-000000070208', 'a0000000-0000-4000-8000-000000070206'),
  ('a0000000-0000-4000-8000-000000078004', 'a0000000-0000-4000-8000-000000070206', 'a0000000-0000-4000-8000-000000070203'),
  ('a0000000-0000-4000-8000-000000078003', 'a0000000-0000-4000-8000-000000070307', 'a0000000-0000-4000-8000-000000070308'),
  ('a0000000-0000-4000-8000-000000078017', 'a0000000-0000-4000-8000-000000070308', 'a0000000-0000-4000-8000-000000070306'),
  ('a0000000-0000-4000-8000-000000078005', 'a0000000-0000-4000-8000-000000070306', 'a0000000-0000-4000-8000-000000070303'),
  ('a0000000-0000-4000-8000-000000078006', 'a0000000-0000-4000-8000-000000070404', 'a0000000-0000-4000-8000-000000070403'),
  ('a0000000-0000-4000-8000-000000078007', 'a0000000-0000-4000-8000-000000070404', 'a0000000-0000-4000-8000-000000070406'),
  ('a0000000-0000-4000-8000-000000078018', 'a0000000-0000-4000-8000-000000070406', 'a0000000-0000-4000-8000-000000070403'),
  ('a0000000-0000-4000-8000-000000078008', 'a0000000-0000-4000-8000-000000070506', 'a0000000-0000-4000-8000-000000070503'),
  ('a0000000-0000-4000-8000-000000078009', 'a0000000-0000-4000-8000-000000070507', 'a0000000-0000-4000-8000-000000070508'),
  ('a0000000-0000-4000-8000-000000078010', 'a0000000-0000-4000-8000-000000070508', 'a0000000-0000-4000-8000-000000070506'),
  ('a0000000-0000-4000-8000-000000078011', 'a0000000-0000-4000-8000-000000070103', 'a0000000-0000-4000-8000-000000070603'),
  ('a0000000-0000-4000-8000-000000078012', 'a0000000-0000-4000-8000-000000070203', 'a0000000-0000-4000-8000-000000070603'),
  ('a0000000-0000-4000-8000-000000078013', 'a0000000-0000-4000-8000-000000070303', 'a0000000-0000-4000-8000-000000070603'),
  ('a0000000-0000-4000-8000-000000078014', 'a0000000-0000-4000-8000-000000070403', 'a0000000-0000-4000-8000-000000070603'),
  ('a0000000-0000-4000-8000-000000078015', 'a0000000-0000-4000-8000-000000070503', 'a0000000-0000-4000-8000-000000070603')
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
