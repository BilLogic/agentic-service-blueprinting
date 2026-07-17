-- Onboarding Modules step 5: update Google Quiz Front Stage Tech description.

update public.cells
set links = (
  select jsonb_agg(
    case
      when link->>'type' = 'tech_description'
        and link->>'label' = 'Google Quiz embedded in notion'
        then jsonb_set(
          link,
          '{description}',
          to_jsonb(
            'The tutor completes the Google Quiz embedded in the Notion module to check their understanding.'::text
          )
        )
      else link
    end
  )
  from jsonb_array_elements(coalesce(links, '[]'::jsonb)) as link
)
where id = 'a0000000-0000-4000-8000-000000110506';
