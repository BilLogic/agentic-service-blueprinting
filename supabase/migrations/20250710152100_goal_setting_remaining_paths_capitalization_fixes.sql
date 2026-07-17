-- Goal Setting remaining paths (Check, Update, Set Edge, Update Edge) — capitalization + trailing periods.

-- Step names
update public.steps set name = replace(name, 'Share Screen', 'Share screen')
where id in (
  select s.id from public.steps s
  join public.path_steps ps on ps.step_id = s.id
  where ps.path_id in (
    'a0000000-0000-4000-8000-000000000814',
    'a0000000-0000-4000-8000-000000000815',
    'a0000000-0000-4000-8000-000000000816',
    'a0000000-0000-4000-8000-000000000817'
  )
);

update public.steps set name = replace(name, 'Action Column', 'Action column')
where id in (
  select s.id from public.steps s
  join public.path_steps ps on ps.step_id = s.id
  where ps.path_id in (
    'a0000000-0000-4000-8000-000000000814',
    'a0000000-0000-4000-8000-000000000815',
    'a0000000-0000-4000-8000-000000000816',
    'a0000000-0000-4000-8000-000000000817'
  )
);

-- Cell content capitalization
update public.cells
set content = replace(content, 'Share Screen', 'Share screen')
where path_id in (
  'a0000000-0000-4000-8000-000000000814',
  'a0000000-0000-4000-8000-000000000815',
  'a0000000-0000-4000-8000-000000000816',
  'a0000000-0000-4000-8000-000000000817'
);

update public.cells
set content = replace(content, 'Action Column', 'Action column')
where path_id in (
  'a0000000-0000-4000-8000-000000000814',
  'a0000000-0000-4000-8000-000000000815',
  'a0000000-0000-4000-8000-000000000816',
  'a0000000-0000-4000-8000-000000000817'
);

update public.cells
set content = replace(content, 'Classroom teacher', 'classroom teacher')
where path_id in (
  'a0000000-0000-4000-8000-000000000814',
  'a0000000-0000-4000-8000-000000000815',
  'a0000000-0000-4000-8000-000000000816',
  'a0000000-0000-4000-8000-000000000817'
);

update public.cells
set content = replace(content, 'Design team', 'Design Team')
where path_id in (
  'a0000000-0000-4000-8000-000000000814',
  'a0000000-0000-4000-8000-000000000815',
  'a0000000-0000-4000-8000-000000000816',
  'a0000000-0000-4000-8000-000000000817'
);

-- Trailing periods on action cells (exclude tech labels and pure team labels)
update public.cells
set content = content || '.'
where path_id in (
  'a0000000-0000-4000-8000-000000000814',
  'a0000000-0000-4000-8000-000000000815',
  'a0000000-0000-4000-8000-000000000816',
  'a0000000-0000-4000-8000-000000000817'
)
and coalesce(content, '') <> ''
and content not like '%.'
and content not in ('Zoom/Pencil', 'PLUS App', 'Zoom/Pencil, PLUS App')
and content not in (E'Dev Team\nDesign Team', 'Dev Team, Design Team')
and content not like E'Dev Team\nDesign Team';

-- Support descriptions
update public.cells
set description = 'Dev Team builds the app and the Design Team creates the screens and flows relevant to this step. Both implement the findings from the research team into the app in their respective role.'
where path_id in (
  'a0000000-0000-4000-8000-000000000814',
  'a0000000-0000-4000-8000-000000000815',
  'a0000000-0000-4000-8000-000000000816',
  'a0000000-0000-4000-8000-000000000817'
)
and (
  content like 'Dev Team%'
  or description like 'Dev Team Builds%'
);
