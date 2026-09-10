import { describe, expect, it } from 'vitest'
import { parseServiceSlug, serviceRoutePath } from '@/lib/serviceRoute'
import { parseUrlViewState } from '@/lib/urlViewState'

/*
 * The service lives in the path, the view state lives in the search. These pin
 * that they parse independently, so a shared cell link `/<slug>?cell=<id>`
 * carries both the service and the cell.
 */

describe('parseServiceSlug', () => {
  it('is null at the bare root', () => {
    expect(parseServiceSlug('/')).toBeNull()
    expect(parseServiceSlug('')).toBeNull()
  })

  it('reads the first path segment as the slug', () => {
    expect(parseServiceSlug('/field-service')).toBe('field-service')
  })

  it('lowercases so a hand-typed slug still resolves', () => {
    expect(parseServiceSlug('/Field-Service')).toBe('field-service')
  })

  it('ignores anything past the first segment', () => {
    expect(parseServiceSlug('/field-service/anything/else')).toBe('field-service')
  })
})

describe('serviceRoutePath', () => {
  it('builds the path for a slug', () => {
    expect(serviceRoutePath('field-service')).toBe('/field-service')
  })

  it('preserves the search string', () => {
    expect(serviceRoutePath('field-service', '?cell=abc')).toBe('/field-service?cell=abc')
  })

  it('maps a null slug to the bare root', () => {
    expect(serviceRoutePath(null)).toBe('/')
    expect(serviceRoutePath(null, '?cell=abc')).toBe('/?cell=abc')
  })
})

describe('a shared cell link carries the service and the cell', () => {
  it('resolves the service from the path and the cell from the search', () => {
    // The URL a bot builds when it cites a cell in a multi-service deployment.
    const pathname = '/field-service'
    const search = '?cell=cell-123'

    expect(parseServiceSlug(pathname)).toBe('field-service')
    expect(parseUrlViewState(search)).toEqual({ kind: 'blueprint', cellId: 'cell-123' })
  })
})
