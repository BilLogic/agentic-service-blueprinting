-- Goal Setting happy path — Figma reference on PLUS App tech pills (steps 2–5, 7)

update public.cells
set links = (
  select coalesce(
    jsonb_agg(
      case
        when elem->>'type' = 'tech_description' and elem->>'label' = 'PLUS App'
        then elem || jsonb_build_object(
          'url',
          'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=5920-79843&t=X6VgpWcaJyIr1cSu-1'
        )
        else elem
      end
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(c.links) as elem
)
where id in (
  'a0000000-0000-4000-8000-0000001a0206',
  'a0000000-0000-4000-8000-0000001a0306',
  'a0000000-0000-4000-8000-0000001a0406',
  'a0000000-0000-4000-8000-0000001a0506',
  'a0000000-0000-4000-8000-0000001a0706'
);
