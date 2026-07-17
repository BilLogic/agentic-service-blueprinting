-- Remove Lead Tutor step 4 → step 1 loop (fork/decision node between steps 4 and 5)
-- in warm-up, goal setting, and help request parallel-session scenarios.
delete from public.cell_triggers
where id in (
  'a0000000-0000-4000-8000-000000050040',
  'a0000000-0000-4000-8000-000000098040',
  'a0000000-0000-4000-8000-000000099040'
);
