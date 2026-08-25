-- Every ordered table calls its ordering column `position`. Written 2026-08-25.
--
--   lanes.row_position               → lanes.position
--   path_steps.column_position       → path_steps.position
--   cells.slot_position              → cells.position
--   phases.order_position            → phases.position
--   service_scenarios.order_position → service_scenarios.position
--   add_lane(at_row)                 → add_lane(at_position)
--
-- `row` and `column` name how a lane and a step happen to be DRAWN today. The
-- compare view already draws the same lanes in a different geometry, so the
-- axis is a rendering fact and not a domain one. `order_` and `slot_` were
-- noise in front of the same idea.
--
-- Plain `position` rather than `lane_position`: `slices.position` and
-- `slice_items.position` already spell it that way, so this makes every
-- ordered table agree instead of inventing a sixth spelling. `position` is not
-- reserved in Postgres — those two columns have worked since they shipped.
--
-- `at_row` fed row_position and named the same rendering. add_step already
-- takes `at_position`.
--
-- Index and constraint names are left alone: `cells_lane_step_slot_unique` and
-- `path_steps_path_column_unique` describe the join they enforce, and renaming
-- them would churn a PostgREST-visible string for no reader's benefit.

alter table public.lanes             rename column row_position    to position;
alter table public.path_steps        rename column column_position to position;
alter table public.cells             rename column slot_position   to position;
alter table public.phases            rename column order_position  to position;
alter table public.service_scenarios rename column order_position  to position;

select public.__rewrite_function_bodies(
  array[
    '\mrow_position\M',
    '\mcolumn_position\M',
    '\mslot_position\M',
    '\morder_position\M',
    '\mat_row\M'
  ],
  array['position', 'position', 'position', 'position', 'at_position'],
  12
);

comment on column public.path_steps.position is 'Blueprint column index for this step on this path';

select public.__assert_vocabulary_gone(
  array[]::text[],
  array['row_position', 'column_position', 'slot_position', 'order_position', 'at_row']
);
