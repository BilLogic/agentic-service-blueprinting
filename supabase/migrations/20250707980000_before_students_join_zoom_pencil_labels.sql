-- Before Students Join — canonical Zoom/Pencil labels on Front Stage Tech (steps 1–3)

update public.cells
set content = 'PLUS App'
where id = 'a0000000-0000-4000-8000-000000180106';

update public.cells
set content = 'PLUS App, Zoom/Pencil'
where id = 'a0000000-0000-4000-8000-000000180206';

update public.cells
set content = 'PLUS App, Zoom/Pencil'
where id = 'a0000000-0000-4000-8000-000000180306';
