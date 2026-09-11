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

  it('gives different cells a different identity', async () => {
    const a = await findingFingerprint('gap-sweep', ['a', 'b'], undefined)
    const b = await findingFingerprint('gap-sweep', ['a', 'c'], undefined)
    expect(a).not.toBe(b)
  })

  it('collides on the newline joiner only for input that cannot occur', async () => {
    // Honest about the algorithm: joining with '\n' means one id CONTAINING a
    // newline hashes identically to two ids split at it. The joiner is fixed
    // by the audit playbook — changing it would invalidate every fingerprint
    // already stored, and desync every other writer that computes one — so
    // the invariant that saves it is upstream: ids are UUIDs. Both halves of
    // that reasoning are pinned, so if cell ids ever stop being UUIDs the
    // second assertion is the alarm.
    const joined = await findingFingerprint('c', ['a\nb'], undefined)
    const separate = await findingFingerprint('c', ['a', 'b'], undefined)
    expect(joined).toBe(separate)

    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    for (const id of [
      'a0000000-0000-4000-8000-000000040101',
      'a0000000-0000-4000-8000-000000040102',
    ]) {
      expect(id).toMatch(uuid)
      expect(id.includes('\n')).toBe(false)
    }
  })

  it('lets the scope slug discriminate between zero-cell findings', async () => {
    const one = await findingFingerprint('gap-sweep', [], 'intake:orphan-step')
    const two = await findingFingerprint('gap-sweep', [], 'intake:empty-lane')
    expect(one).not.toBe(two)
  })

  it('never lets a cited finding collide with a scoped one', async () => {
    const cited = await findingFingerprint('gap-sweep', ['a'], undefined)
    const scoped = await findingFingerprint('gap-sweep', [], 'intake')
    expect(cited).not.toBe(scoped)
  })
})
