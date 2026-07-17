-- Discovery step 5 Front Stage Tech (Handshake): update description.

update public.cells
set links = (
  select jsonb_agg(
    case
      when link->>'type' = 'tech_description' and link->>'label' = 'Handshake'
        then jsonb_set(
          link,
          '{description}',
          to_jsonb(
            'Potential tutors discover PLUS on Handshake and browse open job postings.'::text
          )
        )
      else link
    end
  )
  from jsonb_array_elements(coalesce(links, '[]'::jsonb)) as link
)
where id in (
  'a0000000-0000-4000-8000-000000070506',
  'a0000000-0000-4000-8000-000000720506'
);
