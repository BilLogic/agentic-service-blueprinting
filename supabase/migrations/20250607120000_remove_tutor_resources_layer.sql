-- Remove Tutor Resources swim lane from Warm-Up paths (happy, alternate, sad).

delete from public.cell_triggers
where source_cell_id in (
  select id
  from public.cells
  where layer_id in (
    'a0000000-0000-4000-8000-000000000305',
    'a0000000-0000-4000-8000-000000000405',
    'a0000000-0000-4000-8000-000000000505'
  )
)
or target_cell_id in (
  select id
  from public.cells
  where layer_id in (
    'a0000000-0000-4000-8000-000000000305',
    'a0000000-0000-4000-8000-000000000405',
    'a0000000-0000-4000-8000-000000000505'
  )
);

delete from public.cells
where layer_id in (
  'a0000000-0000-4000-8000-000000000305',
  'a0000000-0000-4000-8000-000000000405',
  'a0000000-0000-4000-8000-000000000505'
);

delete from public.layers
where id in (
  'a0000000-0000-4000-8000-000000000305',
  'a0000000-0000-4000-8000-000000000405',
  'a0000000-0000-4000-8000-000000000505'
);

-- Renumber row positions after removing row 5.
update public.layers
set row_position = 5
where id in (
  'a0000000-0000-4000-8000-000000000304',
  'a0000000-0000-4000-8000-000000000404',
  'a0000000-0000-4000-8000-000000000504'
);

update public.layers
set row_position = 6
where id in (
  'a0000000-0000-4000-8000-000000000307',
  'a0000000-0000-4000-8000-000000000407',
  'a0000000-0000-4000-8000-000000000507'
);

update public.layers
set row_position = 7
where id in (
  'a0000000-0000-4000-8000-000000000308',
  'a0000000-0000-4000-8000-000000000408',
  'a0000000-0000-4000-8000-000000000508'
);

update public.layers
set row_position = 8
where id in (
  'a0000000-0000-4000-8000-000000000309',
  'a0000000-0000-4000-8000-000000000409',
  'a0000000-0000-4000-8000-000000000509'
);
