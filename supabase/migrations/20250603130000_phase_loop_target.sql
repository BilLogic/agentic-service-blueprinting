-- Optional loop target on a phase (e.g. post-session → pre-session)

alter table public.phases
  add column if not exists loops_to_phase_id uuid references public.phases (id) on delete set null;

comment on column public.phases.loops_to_phase_id is
  'When set, UI shows a return transition from this phase to the target phase';

create index if not exists phases_loops_to_phase_id_idx on public.phases (loops_to_phase_id);
