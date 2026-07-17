-- Students Just Joined — Lead Tutor → Front Stage Tech (steps 1–2)

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  ('a0000000-0000-4000-8000-000000097031', 'a0000000-0000-4000-8000-000000190102', 'a0000000-0000-4000-8000-000000190106'),
  ('a0000000-0000-4000-8000-000000097032', 'a0000000-0000-4000-8000-000000190202', 'a0000000-0000-4000-8000-000000190206')
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
