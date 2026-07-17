-- Set Goals Edge Case — path description plural "goals".

update public.paths
set description =
  'Goal cycle began and deadline not reached, but student did not set goals last session and student has no prior goals.'
where id = 'a0000000-0000-4000-8000-000000000816';
