-- Warm-Up path descriptions — engagement-based (Option D).

update public.paths
set description = 'Engaged or partially engaged student warm-up.'
where id = 'a0000000-0000-4000-8000-000000000300';

update public.paths
set description = 'Not engaged student warm-up.'
where id = 'a0000000-0000-4000-8000-000000000350';
