-- Students Just Joined Happy Path — sentence-case capitalization + trailing periods.

update public.cells
set content = 'Remind students that tutors support multiple students and wait time is normal.'
where id = 'a0000000-0000-4000-8000-000000190101';

update public.cells
set content = 'Ask students to share screen and log into math software.'
where id = 'a0000000-0000-4000-8000-000000190201';

update public.cells
set content = 'Show students how to use the ''raise hand'' emoji to let tutors know when they need help.'
where id = 'a0000000-0000-4000-8000-000000190301';

update public.cells
set content = 'Greet students as they join.'
where id = 'a0000000-0000-4000-8000-000000190102';

update public.cells
set content = 'Mute students if necessary.'
where id = 'a0000000-0000-4000-8000-000000190202';

update public.cells
set content = 'Ping tutor if they missed moving student to breakout room for late joiners.'
where id = 'a0000000-0000-4000-8000-000000190302';

update public.cells
set content = 'Move student to breakout room.'
where id = 'a0000000-0000-4000-8000-000000190303';

update public.cells
set description = 'On Zoom/Pencil, the lead tutor mutes students if necessary while they share screen with the teacher and log into math software.'
where id = 'a0000000-0000-4000-8000-000000190206';
