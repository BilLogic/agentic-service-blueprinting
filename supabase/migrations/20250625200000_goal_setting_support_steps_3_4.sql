-- Goal-Setting: remove Graduate Researcher line from Support Actions steps 3–4

update public.cells
set content = E'Dev Team\nDesign team'
where id in (
  'a0000000-0000-4000-8000-0000001a0309',
  'a0000000-0000-4000-8000-0000001a0409'
);
