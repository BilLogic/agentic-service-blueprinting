-- Tech Setup step 2 Front Stage Actions — restore full action copy.

update public.cells
set content = 'CMU HR Department sends over clearance materials.'
where id = 'a0000000-0000-4000-8000-000000100204';
