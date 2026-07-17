-- Onboarding Modules — remove Back Stage Tech from step 3 (Reading lesson).

delete from public.cell_triggers
where source_cell_id = 'a0000000-0000-4000-8000-000000110308'
   or target_cell_id = 'a0000000-0000-4000-8000-000000110308';

delete from public.cells
where id = 'a0000000-0000-4000-8000-000000110308';
