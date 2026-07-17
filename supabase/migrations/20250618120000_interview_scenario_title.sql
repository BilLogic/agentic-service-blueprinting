-- Rename Application → Interview scenario to Interview & Offer
update public.service_scenarios
set
  name = 'Interview & Offer',
  description = 'Potential Tutors Interview for role and receive an offer.'
where id = 'a0000000-0000-4000-8000-000000000122';
