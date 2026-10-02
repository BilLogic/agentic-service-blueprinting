#!/usr/bin/env node
/**
 * A RELEASE TAG PUBLISHES THE INITIALISER, ONCE, AND ONLY WHEN THE NUMBERS AGREE.
 *
 * The publish workflow runs one command it cannot take back, so the decision
 * to run it is a function and is held here. Every case hands the decision what
 * it would otherwise read — the tag, the repository, the manifest, the places
 * that state the version — and a registry that answers from the test. Nothing
 * here reaches the network, and nothing here publishes.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { INITIALISER_MANIFEST } from '../check-version-agreement.mjs'
import {
  decide,
  judgementOf,
  outputOf,
  registryLookup,
  repositoryOf,
} from '../decide-initialiser-publish.mjs'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

const MANIFEST = {
  name: 'create-uno-blueprint',
  version: '2.4.0',
  repository: {
    type: 'git',
    url: 'git+https://github.com/BilLogic/uno-blueprint.git',
    directory: 'packages/create-uno-blueprint',
  },
}

/** Every place stating `version`, the initialiser's manifest among them. */
const stating = (version, initialiser = version) => ({
  'package.json': version,
  '.claude-plugin/plugin.json': version,
  'CHANGELOG.md': version,
  'package-lock.json': version,
  [INITIALISER_MANIFEST]: initialiser,
})

/** A registry that holds `versions` of the initialiser, and counts its callers. */
function registryHolding(...versions) {
  const asked = []
  const isPublished = async (name, version) => {
    asked.push(`${name}@${version}`)
    return versions.includes(version)
  }
  return { isPublished, asked }
}

/** The decision for a `v2.4.0` release in the template's own repository, with overrides. */
const decided = (overrides = {}) =>
  decide({
    tag: 'v2.4.0',
    repository: 'BilLogic/uno-blueprint',
    manifest: MANIFEST,
    stated: stating('2.4.0'),
    isPublished: registryHolding().isPublished,
    ...overrides,
  })

test('a tag for a version the registry does not have publishes it', async () => {
  const registry = registryHolding('2.3.0')
  const decision = await decided({ isPublished: registry.isPublished })
  assert.equal(decision.publish, true)
  assert.deepEqual(decision.refusals, [])
  assert.deepEqual(registry.asked, ['create-uno-blueprint@2.4.0'])
  assert.match(decision.line, /create-uno-blueprint@2\.4\.0/)
})

test('a version already on the registry is left alone, and that is a success', async () => {
  const decision = await decided({ isPublished: registryHolding('2.4.0').isPublished })
  assert.equal(decision.publish, false)
  assert.deepEqual(decision.refusals, [])
  assert.match(decision.line, /already on the registry/)
  // Green: a clean judgement with a line and a count, and nothing found.
  const judgement = judgementOf(decision)
  assert.deepEqual(judgement.findings, [])
  assert.equal(judgement.count, 1)
})

test('a tag that is not the version the initialiser states is refused', async () => {
  const registry = registryHolding()
  const decision = await decided({ tag: 'v2.5.0', isPublished: registry.isPublished })
  assert.equal(decision.publish, false)
  assert.equal(decision.refusals.length, 1)
  assert.match(decision.refusals[0], /v2\.5\.0/)
  assert.match(decision.refusals[0], /2\.4\.0/)
  // Refused before the registry is asked anything.
  assert.deepEqual(registry.asked, [])
  assert.equal(judgementOf(decision).findings.length, 1)
})

test('an initialiser one number off the template is refused, naming its manifest', async () => {
  const decision = await decided({ stated: stating('2.5.0', '2.4.0') })
  assert.equal(decision.publish, false)
  assert.ok(
    decision.refusals.some((refusal) => refusal.includes(INITIALISER_MANIFEST)),
    decision.refusals.join('\n'),
  )
})

test('a tag that is not a release tag is refused', async () => {
  for (const tag of ['v2.4', 'v2.4.0-rc.1', 'vnext', '2.4.0']) {
    const decision = await decided({ tag })
    assert.equal(decision.publish, false, tag)
    assert.match(decision.refusals[0], /v<major>\.<minor>\.<patch>/, tag)
  }
})

test('a run that was not started by a tag is refused', async () => {
  const decision = await decided({ tag: null })
  assert.equal(decision.publish, false)
  assert.match(decision.refusals[0], /not started by a tag/)
})

test('a registry that could not be asked is a refusal, never a publish', async () => {
  const decision = await decided({
    isPublished: async () => {
      throw new Error('the registry answered 503')
    },
  })
  assert.equal(decision.publish, false)
  assert.match(decision.refusals[0], /the registry answered 503/)
})

test('a tree with no initialiser, which is what a workspace is, has nothing to publish', async () => {
  const registry = registryHolding()
  const decision = await decided({ manifest: null, isPublished: registry.isPublished })
  assert.equal(decision.publish, false)
  assert.deepEqual(decision.refusals, [])
  assert.deepEqual(registry.asked, [])
  // Said through the unverified register rather than as a clean run.
  assert.ok(judgementOf(decision).unverified)
})

test('a copy of the repository is not where the package is published from', async () => {
  const registry = registryHolding()
  for (const repository of ['somebody/uno-blueprint', 'billogic/uno-blueprint', undefined]) {
    const decision = await decided({ repository, isPublished: registry.isPublished })
    assert.equal(decision.publish, false, String(repository))
    assert.deepEqual(decision.refusals, [], String(repository))
    assert.ok(judgementOf(decision).unverified, String(repository))
  }
  assert.deepEqual(registry.asked, [])
})

test('the repository a manifest names is read out of its url, in either spelling', () => {
  assert.equal(repositoryOf(MANIFEST), 'BilLogic/uno-blueprint')
  assert.equal(
    repositoryOf({ repository: 'https://github.com/BilLogic/uno-blueprint' }),
    'BilLogic/uno-blueprint',
  )
  assert.equal(repositoryOf({ repository: { url: 'git+ssh://example.test/a/b.git' } }), null)
  assert.equal(repositoryOf({}), null)
})

test('the step output says publish or not, and a refusal says not', async () => {
  assert.equal(outputOf(await decided()), 'publish=true\n')
  assert.equal(outputOf(await decided({ tag: 'v9.9.9' })), 'publish=false\n')
  assert.equal(outputOf(await decided({ manifest: null })), 'publish=false\n')
})

test('the lookup reads the registry: 200 is published, 404 is not, anything else is an error', async () => {
  const asked = []
  const answering = (status) => async (url) => {
    asked.push(String(url))
    return { status }
  }
  assert.equal(await registryLookup(answering(200))('create-uno-blueprint', '2.4.0'), true)
  assert.equal(await registryLookup(answering(404))('create-uno-blueprint', '2.4.0'), false)
  await assert.rejects(
    registryLookup(answering(503))('create-uno-blueprint', '2.4.0'),
    /503/,
  )
  await assert.rejects(
    registryLookup(async () => {
      throw new Error('getaddrinfo ENOTFOUND')
    })('create-uno-blueprint', '2.4.0'),
    /ENOTFOUND/,
  )
  assert.equal(asked[0], 'https://registry.npmjs.org/create-uno-blueprint/2.4.0')
})

// A workspace the initialiser wrote carries this file and no `packages/`, so
// there is no manifest for it to hold.
test.skipIf(!existsSync(join(ROOT, INITIALISER_MANIFEST)))(
  'the manifest this tree ships can be published from the repository it names',
  () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, INITIALISER_MANIFEST), 'utf8'))
    // Trusted publishing matches the manifest's repository against the one the
    // workflow runs in, and the initialiser downloads its release from the same
    // place. One that cannot be read is a publish the registry refuses.
    assert.equal(repositoryOf(manifest), 'BilLogic/uno-blueprint')
    assert.equal(manifest.repository.directory, 'packages/create-uno-blueprint')
    assert.equal(manifest.publishConfig?.access, 'public')
    assert.notEqual(manifest.private, true)
  },
)
