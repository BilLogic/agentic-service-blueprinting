-- Onboarding Modules step 2: update PLUS App Front Stage Tech description.

update public.cells
set links = (
  select jsonb_agg(
    case
      when link->>'type' = 'tech_description' and link->>'label' = 'PLUS App'
        then jsonb_set(
          link,
          '{description}',
          to_jsonb(
            'The tutor finds the link to the onboarding module content that exists on Notion on the individual module page in the PLUS app.'::text
          )
        )
      else link
    end
  )
  from jsonb_array_elements(coalesce(links, '[]'::jsonb)) as link
)
where id = 'a0000000-0000-4000-8000-000000110206';
