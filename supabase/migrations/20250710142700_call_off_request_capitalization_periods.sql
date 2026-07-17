-- Call-off Request — capitalization and trailing periods only.

update public.cells set content = 'Tutor needs to call off.'
where id = 'a0000000-0000-4000-8000-000000170103';

update public.cells set content = 'If it''s 12 or more hours before session, tutor complete shift swap form.'
where id = 'a0000000-0000-4000-8000-000000170203';

update public.cells set content = 'Tutor supervisor team reviews Google Form request for shift swap.'
where id = 'a0000000-0000-4000-8000-000000170207';

update public.cells set content = 'If it is less than 12 hours before session, tutor emails supervisor.'
where id = 'a0000000-0000-4000-8000-000000170303';

update public.cells set content = 'Tutor supervisor receives email request for shift swap.'
where id = 'a0000000-0000-4000-8000-000000170304';

update public.cells set content = 'Tutor send message in #shift-swap to see if anyone can cover.'
where id = 'a0000000-0000-4000-8000-000000170403';

update public.cells set content = 'Other tutors in #shift-swap channel may or may not respond.'
where id = 'a0000000-0000-4000-8000-000000170404';

update public.cells set content = 'Tutor supervisor team may or may not find replacement for tutor and determines if this counts as excused or unexcused decision.'
where id = 'a0000000-0000-4000-8000-000000170507';

update public.cells set content = 'Tutor receives excused or unexcused decision.'
where id = 'a0000000-0000-4000-8000-000000170603';

update public.cells set content = 'Tutor supervisor team sends excuse decision.'
where id = 'a0000000-0000-4000-8000-000000170604';
