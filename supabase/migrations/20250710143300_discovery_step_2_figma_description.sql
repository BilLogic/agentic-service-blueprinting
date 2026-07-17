-- Discovery step 2 Back Stage Tech (Figma): update description.

update public.cells
set links = (
  select jsonb_agg(
    case
      when link->>'type' = 'tech_description' and link->>'label' = 'Figma'
        then jsonb_set(
          link,
          '{description}',
          to_jsonb(
            'The marketing team uses Figma to design social graphics and post layouts before publishing PLUS content to social platforms.'::text
          )
        )
      else link
    end
  )
  from jsonb_array_elements(coalesce(links, '[]'::jsonb)) as link
)
where id in (
  'a0000000-0000-4000-8000-000000070208',
  'a0000000-0000-4000-8000-000000720208'
);
