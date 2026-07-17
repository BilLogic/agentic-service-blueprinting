-- Onboarding Modules — remove Back Stage Tech from step 4 (Supplementary materials).

delete from public.cell_triggers
where source_cell_id = 'a0000000-0000-4000-8000-000000110408'
   or target_cell_id = 'a0000000-0000-4000-8000-000000110408';

delete from public.cells
where id = 'a0000000-0000-4000-8000-000000110408';
