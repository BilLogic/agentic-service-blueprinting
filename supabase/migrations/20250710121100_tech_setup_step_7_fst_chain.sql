-- Tech Setup step 7 — route Slack invite through Front Stage Tech (Email/Slack).

update public.cell_triggers
set
  source_cell_id = 'a0000000-0000-4000-8000-000000100704',
  target_cell_id = 'a0000000-0000-4000-8000-000000100706'
where id = 'a0000000-0000-4000-8000-000000088051';

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values (
  'a0000000-0000-4000-8000-000000088052',
  'a0000000-0000-4000-8000-000000100706',
  'a0000000-0000-4000-8000-000000100703'
)
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
