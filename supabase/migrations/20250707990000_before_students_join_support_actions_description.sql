-- Before Students Join — Support Actions description (steps 1–3)

update public.cells
set description =
  'Dev Team Builds the app and the Design Team creates the screens and flows relevant to this step. Both implement the findings from the research team into the app in their respective role.'
where id in (
  'a0000000-0000-4000-8000-000000180109',
  'a0000000-0000-4000-8000-000000180209',
  'a0000000-0000-4000-8000-000000180309'
);
