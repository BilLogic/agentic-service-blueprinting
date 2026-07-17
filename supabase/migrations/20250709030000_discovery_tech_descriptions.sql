-- Discovery — tech and support descriptions for Front Stage Tech, Back Stage Tech, and Support Actions.

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Social Media',
    'description', 'Potential tutors discover PLUS through social posts on platforms like Instagram, LinkedIn, and similar channels where the marketing team shares recruiting content.'
  )
)
where id in (
  'a0000000-0000-4000-8000-000000070206',
  'a0000000-0000-4000-8000-000000720206'
);

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Figma',
    'description', 'The marketing team uses Figma to design social graphics and post layouts before publishing PLUS recruiting content to social platforms.',
    'picture', '/blueprint-images/shared/back-stage-tech/figma-logo.png'
  )
)
where id in (
  'a0000000-0000-4000-8000-000000070208',
  'a0000000-0000-4000-8000-000000720208'
);

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Branding Guidelines',
    'description', 'Branding Guidelines are followed by the marketing team to keep PLUS social content visually and tonally consistent.'
  )
)
where id in (
  'a0000000-0000-4000-8000-000000070209',
  'a0000000-0000-4000-8000-000000720209'
);

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Marketing Website',
    'description', 'Potential tutors visit the PLUS marketing website to learn about the program, understand the tutor role, and find a path to apply.',
    'picture', '/blueprint-images/application-discovery/happy-path/front-stage-tech/step-03-marketing-website.png'
  ),
  jsonb_build_object(
    'type', 'url',
    'label', 'Visit marketing website',
    'url', 'https://www.tutors.plus/'
  )
)
where id in (
  'a0000000-0000-4000-8000-000000070306',
  'a0000000-0000-4000-8000-000000720306'
);

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
where id in (
  'a0000000-0000-4000-8000-000000070308',
  'a0000000-0000-4000-8000-000000720308'
);

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
where id in (
  'a0000000-0000-4000-8000-000000070309',
  'a0000000-0000-4000-8000-000000720309'
);

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Posters',
    'description', 'Printed posters on campus promote PLUS tutoring opportunities and point prospective tutors toward learning more about the program.'
  ),
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'On-campus booth',
    'description', 'A physical booth at on-campus job fairs where the Tutor Supervisor team meets prospective tutors, answers questions, and shares information about joining PLUS.'
  )
)
where id in (
  'a0000000-0000-4000-8000-000000070406',
  'a0000000-0000-4000-8000-000000720406'
);

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Handshake',
    'description', 'Potential tutors discover PLUS on Handshake and browse tutor postings.'
  )
)
where id in (
  'a0000000-0000-4000-8000-000000070506',
  'a0000000-0000-4000-8000-000000720506'
);

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Handshake Employer Profile',
    'description', 'The Tutor Supervisor Team manages the PLUS employer profile on Handshake, where job postings are published and kept up to date for student applicants.'
  )
)
where id in (
  'a0000000-0000-4000-8000-000000070508',
  'a0000000-0000-4000-8000-000000720508'
);
