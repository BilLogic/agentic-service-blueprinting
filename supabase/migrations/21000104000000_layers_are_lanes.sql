-- layers → lanes, and the two columns that carried the word. Written 2026-08-25.
--
-- The package was already half-renamed and contradicting itself in one
-- statement: `create or replace function public.add_lane` inserts into
-- `public.layers`. The rulebook this package ships — lane-roles.md,
-- data-model.md — is 100% the new vocabulary, so the canvas agent is taught a
-- schema its own backend does not have.
--
-- `CanvasAnnotationLayer` in the frontend is a RENDERING layer and is not
-- touched by any of this: four occurrences, one identifier, unrelated concept.
--
-- The dependent objects are renamed from the catalog rather than by hand. The
-- RESTRICTIVE write policies are built in a loop over a table array, so their
-- names appear nowhere in the source as literals and a hand-written list
-- misses them.

alter table public.layers rename to lanes;
alter table public.lanes  rename column layer_role to lane_role;
alter table public.cells  rename column layer_id   to lane_id;

select public.__rename_schema_objects('layer', 'lane');

-- `cells_layer_step_slot_unique` is named INSIDE upsert_cell's body, as the
-- conflict target. It has no word boundary at `layer`, so it needs its own
-- pattern and has to come before the shorter ones.
select public.__rewrite_function_bodies(
  array[
    '\mcells_layer_step_slot_unique\M',
    '\mlayers\M',
    '\mlayer_id\M',
    '\mlayer_role\M',
    '\mlayer_path\M',
    '\mlayer_map\M'
  ],
  array[
    'cells_lane_step_slot_unique',
    'lanes',
    'lane_id',
    'lane_role',
    'lane_path',
    'lane_map'
  ],
  14
);

-- Comments are attached to the object and survive a rename. Their TEXT does
-- not, and this one is what an adopter reads first.
comment on table public.lanes is 'Blueprint row (swimlane) within a path';
comment on column public.lanes.lane_role is
  'Semantic role key that drives rendering (pill cells, visual rows, divider-line anchoring); the display name stays in lanes.name and is free-form in any language. Canonical values: customer_actions, frontstage_actions, backstage_actions, frontstage_tech, backstage_tech, support_systems, visual, step_visual. The vocabulary is extensible — org-defined custom roles are allowed and render as generic swimlanes. Null = generic swimlane (e.g. actor lanes).';
comment on table public.cells is 'Content at lane × step intersection';
comment on column public.cells.cell_key is
  'Authored key: service/scenario/path/lane/step. Written by the import pipeline for origin=import, minted by upsert_cell for origin=app. Survives re-import; slice_items.cell_keys matches against it.';

select public.__assert_vocabulary_gone(
  array['layer'],
  array['layers', 'layer_id', 'layer_role', 'layer_path', 'layer_map']
);
