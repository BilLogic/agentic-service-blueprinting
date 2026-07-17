-- Discovery scenario — sentence-case capitalization fixes (happy + sad paths).

update public.paths
set description = 'Potential tutors discover and want to join PLUS.'
where id = 'a0000000-0000-4000-8000-000000000700';

update public.paths
set description = 'Potential tutors discover and are not interested in joining PLUS.'
where id = 'a0000000-0000-4000-8000-000000000701';

update public.steps
set name = 'Not interested in joining PLUS'
where id = 'a0000000-0000-4000-8000-000000000717';

update public.cells
set content = 'Previous or current PLUS tutor might have informed about PLUS'
where id in (
  'a0000000-0000-4000-8000-000000070104',
  'a0000000-0000-4000-8000-000000720104'
);

update public.cells
set content = 'Marketing team creates social media posts and manages social platforms.'
where id in (
  'a0000000-0000-4000-8000-000000070207',
  'a0000000-0000-4000-8000-000000720207'
);

update public.cells
set content = 'Design team manages content and messaging on the website. Dev team implements website into code.'
where id in (
  'a0000000-0000-4000-8000-000000070307',
  'a0000000-0000-4000-8000-000000720307'
);

update public.cells
set content = 'Tutor supervisor team meets prospective tutors at on-campus job fair'
where id in (
  'a0000000-0000-4000-8000-000000070404',
  'a0000000-0000-4000-8000-000000720404'
);

update public.cells
set content = 'Discovers PLUS via Handshake.'
where id in (
  'a0000000-0000-4000-8000-000000070503',
  'a0000000-0000-4000-8000-000000720503'
);

update public.cells
set content = 'Tutor supervisor team posts job openings on Handshake'
where id in (
  'a0000000-0000-4000-8000-000000070507',
  'a0000000-0000-4000-8000-000000720507'
);

update public.cells
set content = 'Not interested in joining PLUS'
where id = 'a0000000-0000-4000-8000-000000720603';

update public.cells
set links = jsonb_set(
  links,
  '{1,description}',
  to_jsonb('A physical booth at on-campus job fairs where the tutor supervisor team meets prospective tutors, answers questions, and shares information about joining PLUS.'::text),
  false
)
where id in (
  'a0000000-0000-4000-8000-000000070406',
  'a0000000-0000-4000-8000-000000720406'
);

update public.cells
set links = jsonb_set(
  links,
  '{0,description}',
  to_jsonb('The tutor supervisor team manages the PLUS employer profile on Handshake, where job postings are published and kept up to date for student applicants.'::text),
  false
)
where id in (
  'a0000000-0000-4000-8000-000000070508',
  'a0000000-0000-4000-8000-000000720508'
);
