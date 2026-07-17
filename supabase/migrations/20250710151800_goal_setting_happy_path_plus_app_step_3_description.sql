-- Goal Setting Happy Path: shorten PLUS App step 3 description.

update public.cells
set links = (
  select coalesce(
    jsonb_agg(
      case
        when link->>'label' = 'PLUS App' then
          link || jsonb_build_object(
            'description',
            'The tutor fills out the update, check, or set goals modal in the PLUS app with the student.'
          )
        else link
      end
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(coalesce(links, '[]'::jsonb)) as link
)
where id = 'a0000000-0000-4000-8000-0000001a0306';
