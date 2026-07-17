-- Tech Setup step 6 — distinguish Workday employee vs employer views.

update public.cells
set content = 'Workday (Employee View)'
where id = 'a0000000-0000-4000-8000-000000100606';

update public.cells
set content = 'Workday (Employer View)'
where id = 'a0000000-0000-4000-8000-000000100608';
