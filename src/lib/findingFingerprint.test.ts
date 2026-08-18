import { describe, expect, it } from 'vitest'
import { findingFingerprint } from '@/lib/findingFingerprint'

describe('findingFingerprint', () => {
  it('is order-insensitive over cited cells', async () => {
    const a = await findingFingerprint('gap-sweep', ['cell-b', 'cell-a'], undefined)
    const b = await findingFingerprint('gap-sweep', ['cell-a', 'cell-b'], undefined)
    expect(a).toBe(b)
    expect(a.startsWith('gap-sweep:')).toBe(true)
  })

  it('differs across checks for the same cells', async () => {
    const a = await findingFingerprint('gap-sweep', ['cell-a'], undefined)
    const b = await findingFingerprint('jargon-lint', ['cell-a'], undefined)
    expect(a).not.toBe(b)
  })

  it('uses the scope verbatim for zero-cell findings', async () => {
    expect(
      await findingFingerprint('gap-sweep', [], 'scenario:Map your service:x'),
    ).toBe('gap-sweep:scenario:Map your service:x')
  })
})
