-- Warm-Up Happy and Alternate paths: last step Support Actions is Dev Team / Design team only.

update public.cells
set content = E'Dev Team\nDesign team'
where id in (
  'a0000000-0000-4000-8000-000000040909',
  'a0000000-0000-4000-8000-000000060909'
);
