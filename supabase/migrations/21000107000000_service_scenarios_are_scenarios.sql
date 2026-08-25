-- service_scenarios → scenarios. Written 2026-08-25.
--
-- `service_` prefixed a table that lives two levels below the service, under a
-- phase. Every RPC that touches one already drops it: create_scenario,
-- duplicate_scenario, rename_scenario, delete_scenario, and the
-- `scenario_id` parameter on six more.

alter table public.service_scenarios rename to scenarios;

alter table public.paths rename column service_scenario_id to scenario_id;
alter table public.steps rename column service_scenario_id to scenario_id;

select public.__rename_schema_objects('service_scenario', 'scenario');

select public.__rewrite_function_bodies(
  array['\mservice_scenarios\M', '\mservice_scenario_id\M'],
  array['scenarios', 'scenario_id'],
  14
);

comment on table public.scenarios is 'Scenario within a phase';
comment on column public.steps.scenario_id is 'Scenario that owns this canonical step';

select public.__assert_vocabulary_gone(
  array['service_scenario'],
  array['service_scenarios', 'service_scenario_id']
);
