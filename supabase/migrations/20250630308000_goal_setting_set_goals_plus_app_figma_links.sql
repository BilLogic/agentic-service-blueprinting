-- Set Goals path — step-specific Figma links on PLUS App tech pills

update public.cells as c
set links = (
  select coalesce(
    jsonb_agg(
      case
        when elem->>'type' = 'tech_description' and elem->>'label' = 'PLUS App'
        then elem || jsonb_build_object(
          'url',
          'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=3377-227497&t=X6VgpWcaJyIr1cSu-1'
        )
        else elem
      end
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(c.links) as elem
)
where c.id = 'a0000000-0000-4000-8000-0000001f0206';

update public.cells as c
set links = (
  select coalesce(
    jsonb_agg(
      case
        when elem->>'type' = 'tech_description' and elem->>'label' = 'PLUS App'
        then elem || jsonb_build_object(
          'url',
          'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=3377-227487&t=X6VgpWcaJyIr1cSu-1'
        )
        else elem
      end
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(c.links) as elem
)
where c.id = 'a0000000-0000-4000-8000-0000001f0306';

update public.cells as c
set links = (
  select coalesce(
    jsonb_agg(
      case
        when elem->>'type' = 'tech_description' and elem->>'label' = 'PLUS App'
        then elem || jsonb_build_object(
          'url',
          'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=3377-227490&t=X6VgpWcaJyIr1cSu-1'
        )
        else elem
      end
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(c.links) as elem
)
where c.id = 'a0000000-0000-4000-8000-0000001f0506';

update public.cells as c
set links = (
  select coalesce(
    jsonb_agg(
      case
        when elem->>'type' = 'tech_description' and elem->>'label' = 'PLUS App'
        then elem || jsonb_build_object(
          'url',
          'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=3377-227491&t=X6VgpWcaJyIr1cSu-1'
        )
        else elem
      end
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(c.links) as elem
)
where c.id in (
  'a0000000-0000-4000-8000-0000001f0606',
  'a0000000-0000-4000-8000-0000001f0706',
  'a0000000-0000-4000-8000-0000001f0806'
);

update public.cells as c
set links = (
  select coalesce(
    jsonb_agg(
      case
        when elem->>'type' = 'tech_description' and elem->>'label' = 'PLUS App'
        then elem || jsonb_build_object(
          'url',
          'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=3377-227492&t=X6VgpWcaJyIr1cSu-1'
        )
        else elem
      end
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(c.links) as elem
)
where c.id = 'a0000000-0000-4000-8000-0000001f0906';

update public.cells as c
set links = (
  select coalesce(
    jsonb_agg(
      case
        when elem->>'type' = 'tech_description' and elem->>'label' = 'PLUS App'
        then elem || jsonb_build_object(
          'url',
          'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=6359-220250&t=X6VgpWcaJyIr1cSu-1'
        )
        else elem
      end
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(c.links) as elem
)
where c.id = 'a0000000-0000-4000-8000-0000001f1106';
