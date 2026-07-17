-- Warm-Up Happy Path — sentence-case capitalization + trailing periods.

update public.cells set content = 'Circulate and quietly observe the students.'
where id = 'a0000000-0000-4000-8000-000000040101';
update public.cells set content = 'Remind students to keep working while waiting.'
where id = 'a0000000-0000-4000-8000-000000040201';
update public.cells set content = 'Checks if all students are in the correct breakout room.'
where id = 'a0000000-0000-4000-8000-000000040301';
update public.cells set content = 'Receives information that student is absent from session.'
where id = 'a0000000-0000-4000-8000-000000040401';
update public.cells set content = 'Alerts lead tutor about unassigned or miss-assigned students using the "ask for help" alert.'
where id = 'a0000000-0000-4000-8000-000000040501';
update public.cells set content = 'Handles student tech problems as they arise.'
where id = 'a0000000-0000-4000-8000-000000040601';
update public.cells set content = 'Escalates unresolved issues to tutors@tutor.plus promptly.'
where id = 'a0000000-0000-4000-8000-000000040701';

update public.cells set content = 'Rename students to match roster name.'
where id = 'a0000000-0000-4000-8000-000000040102';
update public.cells set content = 'Add any un-rostered students to attendance list.'
where id = 'a0000000-0000-4000-8000-000000040202';
update public.cells set content = 'Manually assign unpaired students to available tutors.'
where id = 'a0000000-0000-4000-8000-000000040302';
update public.cells set content = 'Inform classroom teacher about students that are absent.'
where id = 'a0000000-0000-4000-8000-000000040402';
update public.cells set content = 'Respond to classroom teachers "ask for help" request.'
where id = 'a0000000-0000-4000-8000-000000040502';

update public.cells set content = 'Enter breakout room.'
where id = 'a0000000-0000-4000-8000-000000040103';
update public.cells set content = 'Greet student.'
where id = 'a0000000-0000-4000-8000-000000040203';
update public.cells set content = 'Ask them to share screen.'
where id = 'a0000000-0000-4000-8000-000000040303';
update public.cells set content = 'Remind them that they can ask for help on content and support.'
where id = 'a0000000-0000-4000-8000-000000040403';
update public.cells set content = 'Mark them as present.'
where id = 'a0000000-0000-4000-8000-000000040503';
update public.cells set content = 'Select engagement level.'
where id = 'a0000000-0000-4000-8000-000000040603';
update public.cells set content = 'Mark them as helped.'
where id = 'a0000000-0000-4000-8000-000000040703';
update public.cells set content = 'Leave breakout room.'
where id = 'a0000000-0000-4000-8000-000000040803';
update public.cells set content = 'Move on to the next student in sorted order set by researchers.'
where id = 'a0000000-0000-4000-8000-000000040903';

update public.cells
set content = E'Dev Team\nDesign Team'
where id in (
  'a0000000-0000-4000-8000-000000040109',
  'a0000000-0000-4000-8000-000000040209',
  'a0000000-0000-4000-8000-000000040309',
  'a0000000-0000-4000-8000-000000040409',
  'a0000000-0000-4000-8000-000000040509',
  'a0000000-0000-4000-8000-000000040609',
  'a0000000-0000-4000-8000-000000040709',
  'a0000000-0000-4000-8000-000000040809',
  'a0000000-0000-4000-8000-000000040909'
);

update public.cells
set description =
  'Dev Team builds the app and the Design Team creates the screens and flows relevant to this step. Both implement the findings from the research team into the app in their respective role.'
where id in (
  'a0000000-0000-4000-8000-000000040509',
  'a0000000-0000-4000-8000-000000040609',
  'a0000000-0000-4000-8000-000000040709',
  'a0000000-0000-4000-8000-000000040909'
);

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor moves on to the next student on the researcher sorted list in the Student Dashboard screen of the PLUS app.',
    'picture', '/blueprint-images/warm-up/shared/plus-app/step-06-your-students-attendance-engagement.png',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=5699-69300&t=LvyyxUtQVUCLMMc2-1'
  )
)
where id = 'a0000000-0000-4000-8000-000000040906';
