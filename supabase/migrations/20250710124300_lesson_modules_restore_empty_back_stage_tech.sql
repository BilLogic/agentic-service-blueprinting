-- Lesson Modules Happy Path — restore empty Back Stage Tech swimlane.

insert into public.layers (id, path_id, name, row_position)
values (
  'a0000000-0000-4000-8000-000000001245',
  'a0000000-0000-4000-8000-000000000802',
  'Back Stage Tech',
  4
)
on conflict (id) do update set
  path_id = excluded.path_id,
  name = excluded.name,
  row_position = excluded.row_position;

update public.layers
set row_position = 5
where id = 'a0000000-0000-4000-8000-000000001244';

update public.layers
set row_position = 6
where id = 'a0000000-0000-4000-8000-000000001246';
