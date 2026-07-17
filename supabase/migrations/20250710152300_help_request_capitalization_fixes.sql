-- Help Request Happy Path — sentence-case capitalization + trailing periods.

-- Partner Action
update public.cells set content = 'Circulate and quietly observe the students.'
where id = 'a0000000-0000-4000-8000-0000001b0101';
update public.cells set content = 'Remind students to keep working while waiting.'
where id = 'a0000000-0000-4000-8000-0000001b0201';
update public.cells set content = 'Checks if all students are in the correct breakout room.'
where id = 'a0000000-0000-4000-8000-0000001b0301';
update public.cells set content = 'Receives information that student is absent from session.'
where id = 'a0000000-0000-4000-8000-0000001b0401';
update public.cells set content = 'Alerts lead tutor about unassigned or miss-assigned students using the "ask for help" alert.'
where id = 'a0000000-0000-4000-8000-0000001b0501';
update public.cells set content = 'Handles student tech problems as they arise.'
where id = 'a0000000-0000-4000-8000-0000001b0601';
update public.cells set content = 'Escalates unresolved issues to tutors@tutor.plus promptly.'
where id = 'a0000000-0000-4000-8000-0000001b0701';

-- Lead Tutor
update public.cells set content = 'Rename students to match roster name.'
where id = 'a0000000-0000-4000-8000-0000001b0102';
update public.cells set content = 'Add any un-rostered students to attendance list.'
where id = 'a0000000-0000-4000-8000-0000001b0202';
update public.cells set content = 'Manually assign unpaired students to available tutors.'
where id = 'a0000000-0000-4000-8000-0000001b0302';
update public.cells set content = 'Inform classroom teacher about students that are absent.'
where id = 'a0000000-0000-4000-8000-0000001b0402';
update public.cells set content = 'Respond to classroom teachers "ask for help" request.'
where id = 'a0000000-0000-4000-8000-0000001b0502';

-- Regular Tutor
update public.cells set content = 'Tutor receives help request.'
where id = 'a0000000-0000-4000-8000-0000001b0103';
update public.cells set content = 'Finish current conversation in 1-2 minutes.'
where id = 'a0000000-0000-4000-8000-0000001b0203';
update public.cells set content = 'Visit student requesting help.'
where id = 'a0000000-0000-4000-8000-0000001b0303';
update public.cells set content = 'Resolve issue.'
where id = 'a0000000-0000-4000-8000-0000001b0403';
update public.cells set content = 'Leave breakout room.'
where id = 'a0000000-0000-4000-8000-0000001b0503';
update public.cells set content = 'Return to the next student in sorted order set by researchers.'
where id = 'a0000000-0000-4000-8000-0000001b0603';

-- Back Stage / Support
update public.cells set content = 'Researchers set student order.'
where id = 'a0000000-0000-4000-8000-0000001b0607';

update public.cells
set content = E'Dev Team\nDesign Team',
    description =
      'Dev Team builds the app and the Design Team creates the screens and flows relevant to this step. Both implement the findings from the research team into the app in their respective role.'
where id = 'a0000000-0000-4000-8000-0000001b0609';

-- Step 7 column header (partner escalate content used as step name)
update public.steps
set name = 'Escalates unresolved issues to tutors@tutor.plus promptly.'
where id = 'a0000000-0000-4000-8000-000000000987';
