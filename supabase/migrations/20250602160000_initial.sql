-- PLUS Service Hub: service catalog
create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.services enable row level security;

create policy "Services are viewable by everyone"
  on public.services
  for select
  using (true);
