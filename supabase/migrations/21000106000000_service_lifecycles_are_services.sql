-- service_lifecycles → services. Written 2026-08-25.
--
-- The table holds one service. "Lifecycle" was the journey THROUGH it, which
-- is what phases already are, so the name described the children.
--
-- `public.services` was a different table once — an unused catalog dropped by
-- the consolidated template schema, seven migrations before this one. Nothing
-- reuses its shape; the name is simply free.
--
-- The rename runs in two passes because two different spellings carry the same
-- idea, and the longer one has to go first or `service_lifecycle` becomes
-- `service_service`.

alter table public.service_lifecycles rename to services;

alter table public.phases       rename column service_lifecycle_id to service_id;
alter table public.slices       rename column service_lifecycle_id to service_id;
alter table public.findings     rename column service_lifecycle_id to service_id;
alter table public.evidence     rename column service_lifecycle_id to service_id;
alter table public.propositions rename column service_lifecycle_id to service_id;

select public.__rename_schema_objects('service_lifecycle', 'service');
select public.__rename_schema_objects('lifecycle', 'service');

select public.__rewrite_function_bodies(
  array['\mservice_lifecycles\M', '\mservice_lifecycle_id\M', '\mlifecycle_id\M'],
  array['services', 'service_id', 'service_id'],
  3
);

comment on table public.services is 'The service this blueprint describes, end to end';

select public.__assert_vocabulary_gone(
  array['lifecycle'],
  array['service_lifecycles', 'service_lifecycle_id', 'lifecycle_id']
);
