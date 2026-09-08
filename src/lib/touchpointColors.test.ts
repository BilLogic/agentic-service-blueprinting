import { afterEach, expect, test } from 'vitest'
import { TOUCHPOINT_TONES } from '@/lib/blueprintCellStyle'
import {
  clearTouchpointRegistry,
  getTouchpointTone,
  normalizeTouchpointLabel,
  setTouchpointRegistry,
  TOUCHPOINT_COLORS,
} from '@/lib/touchpointColors'

afterEach(() => {
  clearTouchpointRegistry()
})

test('with no registry loaded, the generic seed still answers', () => {
  expect(getTouchpointTone('Zoom')).toBe('indigo')
  expect(getTouchpointTone('zoom')).toBe('indigo')
})

test('a stored tone beats the seed, which is the whole point of the column', () => {
  setTouchpointRegistry([{ name: 'Zoom', tone: 'gold', aliases: null }])
  expect(getTouchpointTone('Zoom')).toBe('gold')
})

test('an alias resolves to its row, and to that row’s tone', () => {
  setTouchpointRegistry([
    { name: 'Workday', tone: 'indigo', aliases: ['Workday (Employee View)'] },
  ])
  expect(normalizeTouchpointLabel('workday (employee view)')).toBe('Workday')
  expect(getTouchpointTone('Workday (Employee View)')).toBe('indigo')
})

/*
  The migration that let a touchpoint answer to more than one name left
  uniqueness to the resolver rather than constraining it, so this is the rule
  it deferred. A name is an identity and an alias is a memory of one, so the
  identity wins — and it resolves silently, because a board must draw rather
  than throw when two rows disagree.
*/
test('a name beats another row’s alias for the same spelling', () => {
  setTouchpointRegistry([
    { name: 'Pencil', tone: 'red', aliases: null },
    { name: 'Zoom', tone: 'indigo', aliases: ['Pencil'] },
  ])
  expect(getTouchpointTone('Pencil')).toBe('red')
})

/*
  The column carries no CHECK constraint on purpose, so the reader is the only
  thing standing between a typo and a `data-blueprint-tone` no stylesheet
  answers.
*/
test('a tone outside the seven families is read as no preference', () => {
  const unchosen = getTouchpointTone('Kokomo')
  setTouchpointRegistry([{ name: 'Kokomo', tone: 'chartreuse', aliases: null }])
  expect(getTouchpointTone('Kokomo')).toBe(unchosen)
})

test('a name nobody has chosen for hashes, deterministically and the same each time', () => {
  const first = getTouchpointTone('Some Tool Nobody Named')
  setTouchpointRegistry([{ name: 'Something Else', tone: 'gold', aliases: null }])
  expect(getTouchpointTone('Some Tool Nobody Named')).toBe(first)
  expect(TOUCHPOINT_TONES).toContain(first)
})

/*
  A null `aliases` is not the same value as an empty array, and the column is
  nullable precisely so the two can differ. Every reader has to survive the
  null, and this is the one that would crash on it.
*/
test('a row with no aliases considered is read, not thrown on', () => {
  setTouchpointRegistry([{ name: 'Notion', tone: 'red', aliases: null }])
  expect(getTouchpointTone('Notion')).toBe('red')
})

/*
  The seed is a template's guess at the tools ANY service uses, and it earns
  its place only while it stays that. One adopter's internal app added here
  would ship that adopter's vocabulary to every other adopter's build, which is
  the whole reason `touchpoints.tone` exists — so the map is held to names a
  reader could not attribute to one deployment.
*/
test('every seeded name is a tone the renderer can draw', () => {
  for (const [name, tone] of Object.entries(TOUCHPOINT_COLORS)) {
    expect(TOUCHPOINT_TONES, `${name} carries an unknown tone`).toContain(tone)
  }
})

test('no seed alias is another seed entry’s name', () => {
  const seeded = new Set(Object.keys(TOUCHPOINT_COLORS).map((n) => n.toLowerCase()))
  for (const name of seeded) {
    expect(normalizeTouchpointLabel(name).toLowerCase()).toBe(name)
  }
})
