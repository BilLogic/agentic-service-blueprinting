#!/usr/bin/env node
/**
 * Apply pending Goal Setting data migrations to hosted Supabase.
 *
 * Usage:
 *   npx supabase login
 *   export SUPABASE_ACCESS_TOKEN="$(cat ~/.supabase/access-token 2>/dev/null)"
 *   node scripts/apply_pending_goal_setting_migrations.mjs
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_REF = 'osybxeojvsqcwxkgnalm'
const MIGRATIONS = [
  '20250706230000_goal_setting_regular_tutor_onboarding_links.sql',
  '20250707140000_goal_setting_plus_app_student_dashboard_copy.sql',
  '20250707220000_goal_setting_rename_general_to_happy_path.sql',
]

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const token = process.env.SUPABASE_ACCESS_TOKEN?.trim()

if (!token) {
  console.error(
    'Missing SUPABASE_ACCESS_TOKEN. Run `npx supabase login` first, then:\n' +
      '  export SUPABASE_ACCESS_TOKEN="$(cat ~/.supabase/access-token)"',
  )
  process.exit(1)
}

async function runQuery(query) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    },
  )

  const body = await response.text()
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${body}`)
  }

  return body
}

for (const file of MIGRATIONS) {
  const path = join(root, 'supabase/migrations', file)
  const query = readFileSync(path, 'utf8')
  console.log(`Applying ${file}...`)
  const result = await runQuery(query)
  console.log(result || 'OK')
}

const verify = await runQuery(`
select
  count(*) filter (
    where elem->>'description' like '%Your Students screen%'
      or elem->>'description' like '%PLUS App dashboard%'
  )::int as outdated_plus_app_copy,
  count(*) filter (
    where elem->>'description' like '%Student Dashboard screen%'
  )::int as student_dashboard_copy,
  count(*) filter (
    where elem->>'type' = 'url'
      and elem->>'label' = 'PLUS Onboarding Module 9'
  )::int as plus_onboarding_links
from public.cells c
join public.layers l on l.id = c.layer_id
join public.paths p on p.id = l.path_id
cross join lateral jsonb_array_elements(c.links) as elem
where p.service_scenario_id = 'a0000000-0000-4000-8000-000000000204';
`)

console.log('Verification:', verify)
