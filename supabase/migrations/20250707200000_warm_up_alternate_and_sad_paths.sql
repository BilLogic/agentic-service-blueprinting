-- Warm-Up Alternate Path (from supabase/seeds/warm_up_alternate_path.sql)

insert into public.paths (id, service_scenario_id, name, description, path_type)
values (
  'a0000000-0000-4000-8000-000000000350',
  'a0000000-0000-4000-8000-000000000203',
  'Alternate Path',
  'Warm-up flow that skips the screen-share step.',
  'alternative'
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  path_type = excluded.path_type;

delete from public.path_steps
where path_id = 'a0000000-0000-4000-8000-000000000350'
  and step_id = 'a0000000-0000-4000-8000-000000000313';

delete from public.cells
where path_id = 'a0000000-0000-4000-8000-000000000350'
  and step_id = 'a0000000-0000-4000-8000-000000000313';

insert into public.path_steps (path_id, step_id, column_position)
values
  ('a0000000-0000-4000-8000-000000000350', 'a0000000-0000-4000-8000-000000000311', 1),
  ('a0000000-0000-4000-8000-000000000350', 'a0000000-0000-4000-8000-000000000312', 2),
  ('a0000000-0000-4000-8000-000000000350', 'a0000000-0000-4000-8000-000000000314', 3),
  ('a0000000-0000-4000-8000-000000000350', 'a0000000-0000-4000-8000-000000000315', 4),
  ('a0000000-0000-4000-8000-000000000350', 'a0000000-0000-4000-8000-000000000316', 5),
  ('a0000000-0000-4000-8000-000000000350', 'a0000000-0000-4000-8000-000000000317', 6),
  ('a0000000-0000-4000-8000-000000000350', 'a0000000-0000-4000-8000-000000000318', 7)
on conflict (path_id, step_id) do update set
  column_position = excluded.column_position;

insert into public.layers (id, path_id, name, row_position)
select
  replace(l.id::text, '00000003', '00000004')::uuid,
  'a0000000-0000-4000-8000-000000000350',
  l.name,
  l.row_position
from public.layers l
where l.path_id = 'a0000000-0000-4000-8000-000000000300'
on conflict (id) do update set
  name = excluded.name,
  row_position = excluded.row_position;

insert into public.cells (id, path_id, layer_id, step_id, content)
select
  replace(c.id::text, '00000004', '00000006')::uuid,
  'a0000000-0000-4000-8000-000000000350',
  replace(c.layer_id::text, '00000003', '00000004')::uuid,
  c.step_id,
  c.content
from public.cells c
where c.path_id = 'a0000000-0000-4000-8000-000000000300'
  and c.step_id <> 'a0000000-0000-4000-8000-000000000313'
on conflict (id) do update set
  content = excluded.content,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id;

delete from public.cell_triggers
where id in (
  'a0000000-0000-4000-8000-000000070102',
  'a0000000-0000-4000-8000-000000070110',
  'a0000000-0000-4000-8000-000000070111'
)
or source_cell_id in (
  'a0000000-0000-4000-8000-000000060301',
  'a0000000-0000-4000-8000-000000060302',
  'a0000000-0000-4000-8000-000000060303',
  'a0000000-0000-4000-8000-000000060305',
  'a0000000-0000-4000-8000-000000060306',
  'a0000000-0000-4000-8000-000000060309'
)
or target_cell_id in (
  'a0000000-0000-4000-8000-000000060301',
  'a0000000-0000-4000-8000-000000060302',
  'a0000000-0000-4000-8000-000000060303',
  'a0000000-0000-4000-8000-000000060305',
  'a0000000-0000-4000-8000-000000060306',
  'a0000000-0000-4000-8000-000000060309'
);

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
select
  replace(t.id::text, '00000005', '00000007')::uuid,
  replace(t.source_cell_id::text, '00000004', '00000006')::uuid,
  replace(t.target_cell_id::text, '00000004', '00000006')::uuid
from public.cell_triggers t
where t.id not in (
  'a0000000-0000-4000-8000-000000050102',
  'a0000000-0000-4000-8000-000000050103',
  'a0000000-0000-4000-8000-000000050110',
  'a0000000-0000-4000-8000-000000050111'
)
  and exists (
    select 1
    from public.cells sc
    where sc.id = t.source_cell_id
      and sc.path_id = 'a0000000-0000-4000-8000-000000000300'
  )
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values (
  'a0000000-0000-4000-8000-000000070102',
  'a0000000-0000-4000-8000-000000060203',
  'a0000000-0000-4000-8000-000000060403'
)
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
