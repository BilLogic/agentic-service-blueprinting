import type { Json } from '@/types/database'

/** One `cells.value_props` entry: value generated for one beneficiary. */
export type ValueProp = {
  for: string
  value: string
}

/** Parse the value_props JSONB array; malformed entries are dropped. */
export function parseValueProps(raw: Json | null | undefined): ValueProp[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return []
    const record = entry as Record<string, Json | undefined>
    if (typeof record.for !== 'string' || typeof record.value !== 'string') {
      return []
    }
    return [{ for: record.for, value: record.value }]
  })
}
