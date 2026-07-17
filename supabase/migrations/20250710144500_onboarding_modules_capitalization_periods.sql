-- Onboarding Modules — capitalization and trailing periods only.

update public.cells set content = 'Opens next uncompleted onboarding module.'
where id = 'a0000000-0000-4000-8000-000000110103';

update public.cells set content = 'Follows Notion link in individual module page.'
where id = 'a0000000-0000-4000-8000-000000110203';

update public.cells set content = 'Reads through the onboarding module lesson.'
where id = 'a0000000-0000-4000-8000-000000110303';

update public.cells set content = 'The instructional design team creates and maintains the lesson modules.'
where id = 'a0000000-0000-4000-8000-000000110307';

update public.cells set content = 'Researchers help guide instructional implementation.'
where id in (
  'a0000000-0000-4000-8000-000000110309',
  'a0000000-0000-4000-8000-000000110409',
  'a0000000-0000-4000-8000-000000110509'
);

update public.cells set content = 'Reads through any supplementary materials in the lesson.'
where id = 'a0000000-0000-4000-8000-000000110403';

update public.cells set content = 'The instructional design team maintains the supplementary materials.'
where id = 'a0000000-0000-4000-8000-000000110407';

update public.cells set content = 'Completes Google quiz.'
where id = 'a0000000-0000-4000-8000-000000110503';

update public.cells
set content = 'Google Quiz embedded in Notion',
    links = (
      select jsonb_agg(
        case
          when link->>'type' = 'tech_description'
            and link->>'label' = 'Google Quiz embedded in notion'
            then jsonb_set(link, '{label}', to_jsonb('Google Quiz embedded in Notion'::text))
          else link
        end
      )
      from jsonb_array_elements(coalesce(links, '[]'::jsonb)) as link
    )
where id = 'a0000000-0000-4000-8000-000000110506';

update public.cells set content = 'The instructional design team creates and maintains the Google quiz.'
where id = 'a0000000-0000-4000-8000-000000110507';

update public.cells set content = 'Fills out reflection for module.'
where id = 'a0000000-0000-4000-8000-000000110603';

update public.cells set content = 'Instructional design team designs and maintains reflection questions.'
where id = 'a0000000-0000-4000-8000-000000110607';

update public.cells
set content = E'Researchers help guide instructional implementation.\nDev Team\nDesign Team'
where id = 'a0000000-0000-4000-8000-000000110609';
