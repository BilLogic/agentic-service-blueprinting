-- Reporting an Issue — Lead Tutor step 1 (Reach out) picture.
-- Also applies pending Regular Tutor step 1 and 3 pictures if not yet set.

update public.cells
set picture = '/blueprint-images/reporting-an-issue/happy-path/lead-tutor/step-01-reach-out.png'
where id = 'a0000000-0000-4000-8000-0000001d0102';

update public.cells
set picture = '/blueprint-images/reporting-an-issue/happy-path/regular-tutor/step-01-reach-out.png'
where id = 'a0000000-0000-4000-8000-0000001d0103';

update public.cells
set picture = '/blueprint-images/reporting-an-issue/happy-path/regular-tutor/step-03-follow-up.png'
where id = 'a0000000-0000-4000-8000-0000001d0403';
