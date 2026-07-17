-- Goal Setting — rename Happy Path to General Path

update public.paths
set name = 'General Path'
where id = 'a0000000-0000-4000-8000-00000000080c';
