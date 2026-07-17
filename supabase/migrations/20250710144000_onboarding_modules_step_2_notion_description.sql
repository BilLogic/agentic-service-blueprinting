-- Onboarding Modules step 2: update Notion Front Stage Tech description.

update public.cells
set links = (
  select jsonb_agg(
    case
      when link->>'type' = 'tech_description' and link->>'label' = 'Notion'
        then jsonb_set(
          link,
          '{description}',
          to_jsonb(
            'The tutor follows the Notion link from the PLUS app to begin reading the onboarding module content.'::text
          )
        )
      else link
    end
  )
  from jsonb_array_elements(coalesce(links, '[]'::jsonb)) as link
)
where id = 'a0000000-0000-4000-8000-000000110206';
