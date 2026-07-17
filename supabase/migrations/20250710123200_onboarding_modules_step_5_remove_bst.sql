-- Onboarding Modules — remove Back Stage Tech from step 5 (Quiz completion).

delete from public.cell_triggers
where source_cell_id = 'a0000000-0000-4000-8000-000000110508'
   or target_cell_id = 'a0000000-0000-4000-8000-000000110508';

delete from public.cells
where id = 'a0000000-0000-4000-8000-000000110508';
