-- Interview & Offer — remove step 3 Regular Tutor ↔ Front Stage Actions triggers
-- (vertical arrows routed through the Front Stage Tech / Zoom row).

delete from public.cell_triggers
where id in (
  'a0000000-0000-4000-8000-000000098021',
  'a0000000-0000-4000-8000-000000098022',
  'a0000000-0000-4000-8000-000000098023',
  'a0000000-0000-4000-8000-000000098024'
);
