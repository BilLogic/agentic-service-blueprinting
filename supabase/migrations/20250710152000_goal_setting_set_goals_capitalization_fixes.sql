-- Goal Setting Set Goals path — sentence-case capitalization + trailing periods.

update public.steps
set name = 'Click on Set Goals CTA in the Action column'
where id = 'a0000000-0000-4000-8000-000000009a02';

update public.steps
set name = 'Share screen'
where id = 'a0000000-0000-4000-8000-000000009a03';

-- Partner Action
update public.cells set content = 'Circulate and quietly observe the students.'
where id = 'a0000000-0000-4000-8000-0000001f0101';
update public.cells set content = 'Remind students to keep working while waiting.'
where id = 'a0000000-0000-4000-8000-0000001f0201';
update public.cells set content = 'Checks if all students are in the correct breakout room.'
where id = 'a0000000-0000-4000-8000-0000001f0301';
update public.cells set content = 'Receives information that student is absent from session.'
where id = 'a0000000-0000-4000-8000-0000001f0401';
update public.cells set content = 'Alerts lead tutor about unassigned or miss-assigned students using the "ask for help" alert.'
where id = 'a0000000-0000-4000-8000-0000001f0501';
update public.cells set content = 'Handles student tech problems as they arise.'
where id = 'a0000000-0000-4000-8000-0000001f0601';
update public.cells set content = 'Escalates unresolved issues to tutors@tutor.plus promptly.'
where id = 'a0000000-0000-4000-8000-0000001f0701';

-- Lead Tutor
update public.cells set content = 'Rename students to match roster name.'
where id = 'a0000000-0000-4000-8000-0000001f0102';
update public.cells set content = 'Add any un-rostered students to attendance list.'
where id = 'a0000000-0000-4000-8000-0000001f0202';
update public.cells set content = 'Manually assign unpaired students to available tutors.'
where id = 'a0000000-0000-4000-8000-0000001f0302';
update public.cells set content = 'Inform classroom teacher about students that are absent.'
where id = 'a0000000-0000-4000-8000-0000001f0402';
update public.cells set content = 'Respond to classroom teachers "ask for help" request.'
where id = 'a0000000-0000-4000-8000-0000001f0502';

-- Regular Tutor
update public.cells set content = 'Join breakout session.'
where id = 'a0000000-0000-4000-8000-0000001f0103';
update public.cells set content = 'Click on Set Goals CTA in the Action column.'
where id = 'a0000000-0000-4000-8000-0000001f0203';
update public.cells set content = 'Share screen.'
where id = 'a0000000-0000-4000-8000-0000001f0303';
update public.cells set content = 'Explain to student what goal setting is.'
where id = 'a0000000-0000-4000-8000-0000001f0403';
update public.cells set content = 'Once student understands, starts setting first goal while sharing screen.'
where id = 'a0000000-0000-4000-8000-0000001f0503';
update public.cells set content = 'Fill out goal settings and quantity with the student.'
where id = 'a0000000-0000-4000-8000-0000001f0603';
update public.cells set content = 'If prompted, fill out goal achievement strategy with the student.'
where id = 'a0000000-0000-4000-8000-0000001f0703';
update public.cells set content = 'Save goal.'
where id = 'a0000000-0000-4000-8000-0000001f0803';
update public.cells set content = 'Finalize goal setting with student.'
where id = 'a0000000-0000-4000-8000-0000001f0903';
update public.cells set content = 'Leave breakout room.'
where id = 'a0000000-0000-4000-8000-0000001f1003';
update public.cells set content = 'Move on to the next student in sorted order set by researchers.'
where id = 'a0000000-0000-4000-8000-0000001f1103';

-- Back Stage Actions
update public.cells set content = 'Researchers set goal setting activities.'
where id in (
  'a0000000-0000-4000-8000-0000001f0407',
  'a0000000-0000-4000-8000-0000001f0507',
  'a0000000-0000-4000-8000-0000001f0607',
  'a0000000-0000-4000-8000-0000001f0707',
  'a0000000-0000-4000-8000-0000001f0807',
  'a0000000-0000-4000-8000-0000001f0907'
);
update public.cells set content = 'Researchers set student order.'
where id = 'a0000000-0000-4000-8000-0000001f1107';

-- Support Actions
update public.cells
set content = E'Dev Team\nDesign Team',
    description =
      'Dev Team builds the app and the Design Team creates the screens and flows relevant to this step. Both implement the findings from the research team into the app in their respective role.'
where id in (
  'a0000000-0000-4000-8000-0000001f0209',
  'a0000000-0000-4000-8000-0000001f0309',
  'a0000000-0000-4000-8000-0000001f0509',
  'a0000000-0000-4000-8000-0000001f0609',
  'a0000000-0000-4000-8000-0000001f0709',
  'a0000000-0000-4000-8000-0000001f0809',
  'a0000000-0000-4000-8000-0000001f0909',
  'a0000000-0000-4000-8000-0000001f1109'
);
