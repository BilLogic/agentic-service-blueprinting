-- Warm-Up Happy Path step 3: update Zoom/Pencil share-screen description.

update public.cells
set description = 'The student shares screen via Zoom/Pencil screen share feature.'
where id = 'a0000000-0000-4000-8000-000000040306';
