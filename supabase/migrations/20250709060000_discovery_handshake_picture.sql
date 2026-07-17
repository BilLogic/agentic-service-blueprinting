-- Discovery — Handshake logo for step 5 (Front Stage Tech + Back Stage Tech).

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Handshake',
    'description', 'Potential tutors discover PLUS on Handshake and browse tutor postings.',
    'picture', '/blueprint-images/application-discovery/happy-path/front-stage-tech/step-05-handshake.png'
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
    'description', 'The Tutor Supervisor Team manages the PLUS employer profile on Handshake, where job postings are published and kept up to date for student applicants.',
    'picture', '/blueprint-images/application-discovery/happy-path/front-stage-tech/step-05-handshake.png'
  )
)
where id in (
  'a0000000-0000-4000-8000-000000070508',
  'a0000000-0000-4000-8000-000000720508'
);
