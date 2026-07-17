-- Wrap-up Happy Path — sentence-case capitalization + trailing periods.

-- Partner Action
update public.cells set content = 'Help students log out of Zoom.'
where id = 'a0000000-0000-4000-8000-0000001c0101';
update public.cells set content = 'Remind students to save their work or note what they accomplished.'
where id = 'a0000000-0000-4000-8000-0000001c0201';
update public.cells set content = 'Encourage them to reflect on what they learned or practiced.'
where id = 'a0000000-0000-4000-8000-0000001c0301';
update public.cells set content = 'Share quick reminders to students about what to bring or prepare for next time.'
where id = 'a0000000-0000-4000-8000-0000001c0401';

-- Lead Tutor
update public.cells set content = 'Close breakout rooms.'
where id = 'a0000000-0000-4000-8000-0000001c0102';
update public.cells set content = 'Thank students.'
where id = 'a0000000-0000-4000-8000-0000001c0202';
update public.cells set content = 'Debrief with tutors.'
where id = 'a0000000-0000-4000-8000-0000001c0302';
update public.cells set content = 'Remind tutors to upload Zoom recording and complete reflection form.'
where id = 'a0000000-0000-4000-8000-0000001c0402';

-- Regular Tutor
update public.cells set content = 'Return to main room.'
where id = 'a0000000-0000-4000-8000-0000001c0103';
update public.cells set content = 'Thank students.'
where id = 'a0000000-0000-4000-8000-0000001c0203';
update public.cells set content = 'Debrief with lead tutor.'
where id = 'a0000000-0000-4000-8000-0000001c0303';
update public.cells set content = 'Fill out reflection form and upload Zoom recording.'
where id = 'a0000000-0000-4000-8000-0000001c0403';
