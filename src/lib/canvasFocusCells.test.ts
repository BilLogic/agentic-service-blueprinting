import { afterEach, describe, expect, it } from 'vitest'
import {
  registerActiveFocusCells,
  resolveActiveFocusCells,
  type FocusCellsFn,
} from '@/lib/canvasFocusCells'

const flown: FocusCellsFn = async () => ({
  kind: 'flown',
  completion: 'completed',
})
const miss: FocusCellsFn = async () => ({
  kind: 'miss',
  missing: ['cell-1'],
})

const cleanups: Array<() => void> = []

afterEach(() => {
  while (cleanups.length) cleanups.pop()?.()
})

describe('active canvas owner', () => {
  it('has no owner after the current viewport unregisters', () => {
    const remove = registerActiveFocusCells(flown)
    cleanups.push(remove)
    remove()
    expect(resolveActiveFocusCells()).toBeNull()
  })

  it('does not let a hidden viewport steal the current owner on unregister', () => {
    const hidden = registerActiveFocusCells(flown)
    cleanups.push(registerActiveFocusCells(miss))
    hidden()
    expect(resolveActiveFocusCells()).toBe(miss)
  })
})
