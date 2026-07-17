-- Before Students Join step 3 — Front Stage Tech Zoom/Pencil only; remove Support Actions cell

update public.cells
set content = 'Zoom/Pencil'
where id = 'a0000000-0000-4000-8000-000000180306';

delete from public.cell_triggers
where source_cell_id = 'a0000000-0000-4000-8000-000000180309'
   or target_cell_id = 'a0000000-0000-4000-8000-000000180309';

delete from public.cells
where id = 'a0000000-0000-4000-8000-000000180309';
