-- Discovery — Handshake (step 5) and Support Actions descriptions (steps 2–3).

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
    'label', 'Handshake',
    'description', 'Potential tutors discover PLUS on Handshake and browse tutor postings.'
  )
)
where id in (
  'a0000000-0000-4000-8000-000000070506',
  'a0000000-0000-4000-8000-000000720506'
);
