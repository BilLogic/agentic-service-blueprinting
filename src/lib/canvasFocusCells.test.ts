import { afterEach, describe, expect, it } from 'vitest'
import {
  clearPendingSliceCellFocus,
  flushPendingFocus,
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

describe('a pending focus on a board still loading', () => {
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

  /** Misses until `ready` is set, like a viewport behind its skeleton. */
  function loadingBoard(): {
    focus: FocusCellsFn
    calls: string[][]
    ready: () => void
  } {
    const calls: string[][] = []
    let drawn = false
    const focus: FocusCellsFn = async (cellIds) => {
      calls.push([...cellIds])
      return drawn
        ? { kind: 'flown', completion: 'completed' }
        : { kind: 'miss', missing: [...cellIds] }
    }
    return { focus, calls, ready: () => (drawn = true) }
  }

  it('keeps the request through a miss at registration and lands it on the first fit', async () => {
    const board = loadingBoard()
    const key = sliceFocusCellsKey('slice-1')
    requestSliceCellFocus('slice-1', ['cell-a'])
    cleanups.push(registerFocusCells(key, board.focus))
    await settle()
    board.ready()
    flushPendingFocus(key)
    await settle()
    expect(board.calls).toEqual([['cell-a'], ['cell-a']])
    flushPendingFocus(key)
    await settle()
    expect(board.calls).toHaveLength(2)
  })

  it('drops the request when the fitted board still misses', async () => {
    const board = loadingBoard()
    const key = sliceFocusCellsKey('slice-1')
    requestSliceCellFocus('slice-1', ['cell-gone'])
    cleanups.push(registerFocusCells(key, board.focus))
    await settle()
    flushPendingFocus(key)
    await settle()
    board.ready()
    flushPendingFocus(key)
    await settle()
    expect(board.calls).toEqual([['cell-gone'], ['cell-gone']])
  })

  it('does not put back a request that a newer one replaced', async () => {
    const board = loadingBoard()
    const key = sliceFocusCellsKey('slice-1')
    requestSliceCellFocus('slice-1', ['cell-a'])
    cleanups.push(registerFocusCells(key, board.focus))
    requestSliceCellFocus('slice-1', ['cell-b'])
    await settle()
    board.ready()
    flushPendingFocus(key)
    await settle()
    expect(board.calls.at(-1)).toEqual(['cell-b'])
  })
})
