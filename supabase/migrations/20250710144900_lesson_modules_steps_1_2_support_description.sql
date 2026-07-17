-- Lesson Modules steps 1–2: update Support Actions description.
-- Step 3 Dev/Design support description updated to match lesson modules wording.

update public.cells
set description = E'Researchers help guide how lesson content is designed and delivered so tutors learn effectively.\n\nThe Dev Team builds the PLUS app features for lesson modules, and the Design Team creates the screens and flows for that experience.'
where id in (
  'a0000000-0000-4000-8000-000000120109',
  'a0000000-0000-4000-8000-000000120209'
);

update public.cells
set description = 'The Dev Team builds the PLUS app features for lesson modules, and the Design Team creates the screens and flows for that experience.'
where id = 'a0000000-0000-4000-8000-000000120309';
