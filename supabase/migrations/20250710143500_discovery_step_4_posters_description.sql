-- Discovery step 4 Front Stage Tech (Posters): update description.

update public.cells
set links = (
  select jsonb_agg(
    case
      when link->>'type' = 'tech_description' and link->>'label' = 'Posters'
        then jsonb_set(
          link,
          '{description}',
          to_jsonb(
            'Printed posters on campus promote PLUS tutoring opportunities.'::text
          )
        )
      else link
    end
  )
  from jsonb_array_elements(coalesce(links, '[]'::jsonb)) as link
)
where id in (
  'a0000000-0000-4000-8000-000000070406',
  'a0000000-0000-4000-8000-000000720406'
);
