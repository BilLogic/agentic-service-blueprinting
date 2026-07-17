-- Session Sign Up step 1: update Google Spreadsheet Back Stage Tech description.

update public.cells
set description = 'The tutor''s session scheduling information is stored in a Google Spreadsheet.',
    links = (
      select jsonb_agg(
        case
          when link->>'type' = 'tech_description'
            and link->>'label' = 'Google Spreadsheet'
            then jsonb_set(
              link,
              '{description}',
              to_jsonb(
                'The tutor''s session scheduling information is stored in a Google Spreadsheet.'::text
              )
            )
          else link
        end
      )
      from jsonb_array_elements(coalesce(links, '[]'::jsonb)) as link
    )
where id = 'a0000000-0000-4000-8000-000000130108';
