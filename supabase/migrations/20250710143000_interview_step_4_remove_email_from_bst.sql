-- Interview & Offer step 4: remove Email from Back Stage Tech.

update public.cells
set content = E'Zoom\nNotion',
    links = jsonb_build_array(
      jsonb_build_object(
        'type', 'tech_description',
        'label', 'Zoom',
        'description', 'The tutor supervisor team may review the group interview Zoom recording as part of the offer decision process.',
        'picture', '/blueprint-images/goal-setting/shared/front-stage-tech/zoom-logo.png'
      ),
      jsonb_build_object(
        'type', 'tech_description',
        'label', 'Notion',
        'description', 'The tutor supervisor team may review interview notes in Notion as part of the offer decision process.',
        'picture', '/blueprint-images/shared/back-stage-tech/notion-logo.png'
      )
    )
where id = 'a0000000-0000-4000-8000-000000090408';
