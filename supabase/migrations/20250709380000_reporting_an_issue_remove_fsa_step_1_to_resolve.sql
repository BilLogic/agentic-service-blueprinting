-- Reporting an Issue — remove Front Stage Actions step 1 → Resolve concern;
-- keep only step 1 → Request assistance (step 2).

delete from public.cell_triggers
where id = 'a0000000-0000-4000-8000-000000098081';
