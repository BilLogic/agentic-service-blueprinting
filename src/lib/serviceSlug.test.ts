import { describe, expect, it } from 'vitest'
import {
  resolveServiceBySlug,
  serviceSlug,
  slugifyServiceName,
} from '@/lib/serviceSlug'

/*
 * The route slug is a service's own `slug` column (21000130000000), with a
 * name-derived fallback (mirroring the database's `key_slug`) for a row whose
 * column is null. These pin that the column wins over the name — so a rename
 * does not move the URL — that the fallback still derives when the column is
 * absent, and the slug -> service resolution the router turns a `/<slug>` deep
 * link into.
 */

describe('slugifyServiceName', () => {
  it('lowercases and hyphenates like key_slug', () => {
    expect(slugifyServiceName('Support Desk')).toBe('support-desk')
  })

  it('collapses runs of non-alphanumerics into one hyphen', () => {
    expect(slugifyServiceName('Sales  &  Success!')).toBe('sales-success')
  })

  it('trims leading and trailing separators', () => {
    expect(slugifyServiceName('  --Onboarding-- ')).toBe('onboarding')
  })

  it('empties for a name with no ASCII alphanumerics', () => {
    expect(slugifyServiceName('运营协调')).toBe('')
  })
})

describe('serviceSlug', () => {
  it('is the stored slug column when set', () => {
    expect(serviceSlug({ id: 'svc-1', name: 'Support Desk', slug: 'support-desk' })).toBe(
      'support-desk',
    )
  })

  it('is the stored slug, not a derivation of a renamed name', () => {
    // The whole point of the column: the URL is the slug's own identity, so
    // renaming the service does NOT move its route.
    expect(serviceSlug({ id: 'svc-1', name: 'Renamed Service', slug: 'support-desk' })).toBe(
      'support-desk',
    )
  })

  it('falls back to the slugified name when the column is null', () => {
    expect(serviceSlug({ id: 'svc-1', name: 'Support Desk', slug: null })).toBe('support-desk')
  })

  it('falls back to the slugified name when the column is absent', () => {
    expect(serviceSlug({ id: 'svc-1', name: 'Support Desk' })).toBe('support-desk')
  })

  it('falls back to the id when the name slugifies to nothing and no column', () => {
    expect(serviceSlug({ id: 'svc-9', name: '运营协调' })).toBe('svc-9')
  })
})

describe('resolveServiceBySlug', () => {
  const services = [
    { id: 'a', name: 'Support Desk', slug: 'support-desk' },
    { id: 'b', name: 'Sales Pipeline', slug: 'sales-pipeline' },
  ]

  it('resolves a service from its slug column', () => {
    expect(resolveServiceBySlug(services, 'sales-pipeline')?.id).toBe('b')
  })

  it('picks only the named service, never a sibling', () => {
    // The scoping guarantee: a `/sales-pipeline` deep link cannot land on the
    // support service.
    expect(resolveServiceBySlug(services, 'support-desk')?.id).toBe('a')
    expect(resolveServiceBySlug(services, 'support-desk')?.id).not.toBe('b')
  })

  it('resolves by the slug column even when the name would derive differently', () => {
    // A renamed service keeps its route: its column slug still resolves, and
    // the new name's derivation does not.
    const renamed = [{ id: 'b', name: 'Renamed Pipeline', slug: 'sales-pipeline' }]
    expect(resolveServiceBySlug(renamed, 'sales-pipeline')?.id).toBe('b')
    expect(resolveServiceBySlug(renamed, 'renamed-pipeline')).toBeNull()
  })

  it('is case-insensitive', () => {
    expect(resolveServiceBySlug(services, 'Sales-Pipeline')?.id).toBe('b')
  })

  it('returns null when no service matches', () => {
    expect(resolveServiceBySlug(services, 'billing')).toBeNull()
  })
})
