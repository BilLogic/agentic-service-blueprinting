-- Onboarding Modules step 4: update Google Docs/Slides Front Stage Tech description.

update public.cells
set links = (
  select jsonb_agg(
    case
      when link->>'type' = 'tech_description'
        and link->>'label' = 'Google Docs/ Slides'
        then jsonb_set(
          link,
          '{description}',
          to_jsonb(
            'The tutor opens any Google Docs or Slides linked as supplementary materials for the module content.'::text
          )
        )
      else link
    end
  )
  from jsonb_array_elements(coalesce(links, '[]'::jsonb)) as link
)
where id = 'a0000000-0000-4000-8000-000000110406';
