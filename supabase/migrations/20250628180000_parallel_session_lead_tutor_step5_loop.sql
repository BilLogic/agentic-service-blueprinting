-- Lead Tutor last step → first step loop for warm-up, goal setting, and help request.
insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  (
    'a0000000-0000-4000-8000-000000050042',
    'a0000000-0000-4000-8000-000000040502',
    'a0000000-0000-4000-8000-000000040102'
  ),
  (
    'a0000000-0000-4000-8000-000000098042',
    'a0000000-0000-4000-8000-0000001a0502',
    'a0000000-0000-4000-8000-0000001a0102'
  ),
  (
    'a0000000-0000-4000-8000-000000099042',
    'a0000000-0000-4000-8000-0000001b0502',
    'a0000000-0000-4000-8000-0000001b0102'
  )
on conflict (id) do nothing;
