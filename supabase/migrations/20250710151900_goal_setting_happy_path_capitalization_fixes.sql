-- Goal Setting Happy Path — sentence-case capitalization + trailing periods.

-- Partner Action
update public.cells set content = 'Circulate and quietly observe the students.'
where id = 'a0000000-0000-4000-8000-0000001a0101';
update public.cells set content = 'Remind students to keep working while waiting.'
where id = 'a0000000-0000-4000-8000-0000001a0201';
update public.cells set content = 'Checks if all students are in the correct breakout room.'
where id = 'a0000000-0000-4000-8000-0000001a0301';
update public.cells set content = 'Receives information that student is absent from session.'
where id = 'a0000000-0000-4000-8000-0000001a0401';
update public.cells set content = 'Alerts lead tutor about unassigned or miss-assigned students using the "ask for help" alert.'
where id = 'a0000000-0000-4000-8000-0000001a0501';
update public.cells set content = 'Handles student tech problems as they arise.'
where id = 'a0000000-0000-4000-8000-0000001a0601';
update public.cells set content = 'Escalates unresolved issues to tutors@tutor.plus promptly.'
where id = 'a0000000-0000-4000-8000-0000001a0701';

-- Lead Tutor
update public.cells set content = 'Rename students to match roster name.'
where id = 'a0000000-0000-4000-8000-0000001a0102';
update public.cells set content = 'Add any un-rostered students to attendance list.'
where id = 'a0000000-0000-4000-8000-0000001a0202';
update public.cells set content = 'Manually assign unpaired students to available tutors.'
where id = 'a0000000-0000-4000-8000-0000001a0302';
update public.cells set content = 'Inform classroom teacher about students that are absent.'
where id = 'a0000000-0000-4000-8000-0000001a0402';
update public.cells set content = 'Respond to classroom teachers "ask for help" request.'
where id = 'a0000000-0000-4000-8000-0000001a0502';

-- Regular Tutor
update public.cells set content = 'Join breakout session.'
where id = 'a0000000-0000-4000-8000-0000001a0103';
update public.cells set content = 'Share screen.'
where id = 'a0000000-0000-4000-8000-0000001a0203';
update public.cells set content = 'If prompted, complete goal achievement strategy with student.'
where id = 'a0000000-0000-4000-8000-0000001a0403';
update public.cells set content = 'Finalize goal activity with student.'
where id = 'a0000000-0000-4000-8000-0000001a0503';
update public.cells set content = 'Leave breakout room.'
where id = 'a0000000-0000-4000-8000-0000001a0603';
update public.cells set content = 'Move on to the next student in sorted order set by researchers.'
where id = 'a0000000-0000-4000-8000-0000001a0703';

-- Back Stage Actions
update public.cells set content = 'Researcher sets goal setting activities.'
where id in (
  'a0000000-0000-4000-8000-0000001a0307',
  'a0000000-0000-4000-8000-0000001a0407',
  'a0000000-0000-4000-8000-0000001a0507'
);
update public.cells set content = 'Researcher sets student order.'
where id = 'a0000000-0000-4000-8000-0000001a0707';

-- Support Actions labels + description
update public.cells
set content = E'Dev Team\nDesign Team'
where id in (
  'a0000000-0000-4000-8000-0000001a0209',
  'a0000000-0000-4000-8000-0000001a0309',
  'a0000000-0000-4000-8000-0000001a0409',
  'a0000000-0000-4000-8000-0000001a0509',
  'a0000000-0000-4000-8000-0000001a0709'
);

update public.cells
set description =
  'Dev Team builds the app and the Design Team creates the screens and flows relevant to this step. Both implement the findings from the research team into the app in their respective role.'
where id in (
  'a0000000-0000-4000-8000-0000001a0209',
  'a0000000-0000-4000-8000-0000001a0309',
  'a0000000-0000-4000-8000-0000001a0409',
  'a0000000-0000-4000-8000-0000001a0509',
  'a0000000-0000-4000-8000-0000001a0709'
);
