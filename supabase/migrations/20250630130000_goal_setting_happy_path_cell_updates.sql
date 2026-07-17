-- Goal Setting happy path — cell content updates (steps 1, 3, 4, 5)

update public.cells set content = 'Zoom/Pencil'
where id = 'a0000000-0000-4000-8000-0000001a0106';

update public.cells set content = 'Update, check, or set goal depending on point in the goal cycle.'
where id = 'a0000000-0000-4000-8000-0000001a0303';

update public.cells set content = 'Researcher sets goal setting activities'
where id in (
  'a0000000-0000-4000-8000-0000001a0307',
  'a0000000-0000-4000-8000-0000001a0407'
);

update public.cells set content = 'Researcher sets student order'
where id = 'a0000000-0000-4000-8000-0000001a0507';

update public.cells set content = 'PLUS App'
where id = 'a0000000-0000-4000-8000-0000001a0506';

update public.cells set content = E'Dev Team\nDesign team'
where id = 'a0000000-0000-4000-8000-0000001a0509';
