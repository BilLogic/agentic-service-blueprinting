-- Lesson Modules — capitalization and trailing periods only.

update public.cells set content = 'Opens next uncompleted assigned lesson.'
where id = 'a0000000-0000-4000-8000-000000120103';

update public.cells set content = 'Tutor supervisor team assigns lessons.'
where id = 'a0000000-0000-4000-8000-000000120107';

update public.cells
set content = E'Researchers help guide instructional implementation.\nDev Team\nDesign Team'
where id in (
  'a0000000-0000-4000-8000-000000120109',
  'a0000000-0000-4000-8000-000000120209'
);

update public.cells set content = 'Works through the questions.'
where id = 'a0000000-0000-4000-8000-000000120203';

update public.cells set content = 'Instructional design team designs and maintains lessons.'
where id in (
  'a0000000-0000-4000-8000-000000120207',
  'a0000000-0000-4000-8000-000000120307'
);

update public.cells set content = 'Finishes lesson and receives score.'
where id = 'a0000000-0000-4000-8000-000000120303';
