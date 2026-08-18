/**
 * Finding identity — the dedupe contract, in one testable place.
 *
 * Two runs that disagree about this string split one finding's history in
 * two: the same issue is re-reported forever, and a human's "dismissed"
 * stops suppressing it. It lived inside the tool registry, which imports
 * supabase-js and Vite `?raw` markdown and therefore cannot be loaded by
 * the test runner — so the one function whose silent breakage corrupts
 * data had no test. This module exists to give it one.
 *
 * Canvas dialect of audit-playbook §2: `check_name + ':' + sha256` of the
 * sorted cited cell ids joined with newlines (cell_keys are written as the
 * ids themselves here), or `check_name + ':' + scope` for a finding that
 * cites no cells. The IDE hashes IR key-paths instead, which is why the
 * two are deliberately separate dedupe spaces.
 */
export async function findingFingerprint(
  checkName: string,
  cellIds: string[],
  scope: string | undefined,
): Promise<string> {
  if (cellIds.length === 0) return `${checkName}:${scope ?? ''}`
  // Sorted, so the order cells happen to be cited in never changes identity.
  const sorted = [...cellIds].sort().join('\n')
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(sorted),
  )
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  return `${checkName}:${hex}`
}
