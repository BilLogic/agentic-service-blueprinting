import { afterEach, describe, expect, it } from 'vitest'
import {
  clearPendingSliceCellFocus,
  registerActiveFocusCells,
  registerFocusCells,
  requestSliceCellFocus,
  resolveActiveFocusCells,
  sliceFocusCellsKey,
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
  clearPendingSliceCellFocus()
})

/**
 * A `focusCells` stand-in that records the cell ids it was asked to fly to.
 */
function recordingFocus(): {
  focus: FocusCellsFn
  calls: string[][]
} {
  const calls: string[][] = []
  const focus: FocusCellsFn = (cellIds) => {
    calls.push([...cellIds])
    return { kind: 'flown', completion: 'completed' }
  }
  return { focus, calls }
}

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

describe('requestSliceCellFocus', () => {
  it('flies now when a viewport is already registered, with whichever cells each request named', () => {
    const { focus, calls } = recordingFocus()
    cleanups.push(registerFocusCells(sliceFocusCellsKey('slice-1'), focus))
    requestSliceCellFocus('slice-1', ['cell-a'])
    requestSliceCellFocus('slice-1', ['cell-b'])
    expect(calls).toEqual([['cell-a'], ['cell-b']])
  })

  it('stores a pending focus and flies when the viewport registers', () => {
    const { focus, calls } = recordingFocus()
    requestSliceCellFocus('slice-1', ['cell-a'])
    expect(calls).toEqual([])
    cleanups.push(registerFocusCells(sliceFocusCellsKey('slice-1'), focus))
    expect(calls).toEqual([['cell-a']])
  })

  it('keeps only the latest pending request for a slice', () => {
    const { focus, calls } = recordingFocus()
    requestSliceCellFocus('slice-1', ['cell-a'])
    requestSliceCellFocus('slice-1', ['cell-b'])
    cleanups.push(registerFocusCells(sliceFocusCellsKey('slice-1'), focus))
    expect(calls).toEqual([['cell-b']])
  })

  it('does not hand a pending slice focus to a different registry key', () => {
    const other = recordingFocus()
    const slice = recordingFocus()
    requestSliceCellFocus('slice-1', ['cell-a'])
    cleanups.push(registerFocusCells('scenario-slide', other.focus))
    expect(other.calls).toEqual([])
    cleanups.push(registerFocusCells(sliceFocusCellsKey('slice-1'), slice.focus))
    expect(slice.calls).toEqual([['cell-a']])
  })
})
