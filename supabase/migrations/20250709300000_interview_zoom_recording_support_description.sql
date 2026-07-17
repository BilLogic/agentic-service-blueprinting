-- Interview & Offer — step 3 Support Actions (Zoom Recording) description.

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Zoom Recording',
    'description', 'Zoom recording captures the group interview so the tutor supervisor team can review it during the offer decision process.'
  )
)
where id = 'a0000000-0000-4000-8000-000000090309';
