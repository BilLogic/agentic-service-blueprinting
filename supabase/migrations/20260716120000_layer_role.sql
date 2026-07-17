-- Layer semantic roles (Phase 0-C of the service-blueprinting skill plan)
-- Rendering semantics (pill cells, visual rows, divider-line anchoring) were
-- carried by magic English layer names; layer_role makes them an explicit
-- semantic key so the display name in layers.name becomes free-form in any
-- language.

alter table public.layers add column if not exists layer_role text;

comment on column public.layers.layer_role is
  'Semantic role key that drives rendering (pill cells, visual rows, divider-line anchoring); the display name stays in layers.name and is free-form in any language. Canonical values: customer_actions, frontstage_actions, backstage_actions, frontstage_tech, backstage_tech, support_systems, visual, step_visual. The vocabulary is extensible — org-defined custom roles are allowed and render as generic swimlanes. Null = generic swimlane (e.g. actor lanes).';

-- Backfill existing PLUS layers whose semantics were keyed to exact English
-- names. Actor lanes (Regular Tutor, Lead Tutor, Partner Action: Teacher) and
-- 'Support Actions' intentionally stay null — they are generic swimlanes; the
-- frontend's legacy name→role shim keeps their line anchoring working.
update public.layers
set layer_role = case name
  when 'Front Stage Actions' then 'frontstage_actions'
  when 'Back Stage Actions' then 'backstage_actions'
  when 'Front Stage Tech' then 'frontstage_tech'
  when 'Back Stage Tech' then 'backstage_tech'
  when 'Computer Systems' then 'support_systems'
  when 'Visual' then 'visual'
  when 'Step Visual' then 'step_visual'
end
where layer_role is null
  and name in (
    'Front Stage Actions',
    'Back Stage Actions',
    'Front Stage Tech',
    'Back Stage Tech',
    'Computer Systems',
    'Visual',
    'Step Visual'
  );
