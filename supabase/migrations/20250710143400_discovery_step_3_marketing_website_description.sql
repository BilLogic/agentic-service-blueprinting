-- Discovery step 3 Front Stage Tech (Marketing Website): update description.

update public.cells
set links = (
  select jsonb_agg(
    case
      when link->>'type' = 'tech_description'
        and link->>'label' = 'Marketing Website'
        then jsonb_set(
          link,
          '{description}',
          to_jsonb(
            'Potential tutors visit the marketing website to learn about PLUS, understand the tutor role, and find a path to apply.'::text
          )
        )
      else link
    end
  )
  from jsonb_array_elements(coalesce(links, '[]'::jsonb)) as link
)
where id in (
  'a0000000-0000-4000-8000-000000070306',
  'a0000000-0000-4000-8000-000000720306'
);
