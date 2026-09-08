import { describe, expect, it } from 'vitest'
import { BRAND, ORG_NAME } from './config'
import { coverContent } from './content/coverContent'
import {
  asbDefaultConfig,
  resolveDeploymentConfig,
  type DeploymentConfig,
} from './deploymentConfig'

// The deployment seam's one contract: a sparse overlay resolves against the
// template defaults, and the standalone app — no config at all — reads exactly
// as the defaults. Everything below is that contract's edges.

describe('asbDefaultConfig', () => {
  /**
   * The default names three values through constants and inlines none of
   * them, which is what lets a deployment fork `config.ts` and its own
   * `coverContent.ts` instead of this module. Two of the three are absent
   * HERE, on purpose, and this is the assertion that they stay absent: the
   * moment either gains a value in the template, the app repaints — a cover
   * heading and a wordmark that are no longer `ORG_NAME`, and a `--hue` the
   * theme files did not declare.
   */
  it('names the wordmark and the accent, and this template supplies neither', () => {
    expect(asbDefaultConfig.brand?.name).toBe(ORG_NAME)

    expect(coverContent.title).toBeUndefined()
    expect(asbDefaultConfig.content?.workspaceTitle).toBeUndefined()

    expect(BRAND.accent).toBeUndefined()
    expect(asbDefaultConfig.brand?.accent).toBeUndefined()
  })
})

describe('resolveDeploymentConfig', () => {
  it('no config, undefined and null all resolve to the template defaults', () => {
    for (const config of [undefined, null, {}]) {
      const resolved = resolveDeploymentConfig(config)
      expect(resolved.brand.name).toBe(ORG_NAME)
      // The resolved brand is the name alone: an accent the default does not
      // supply is dropped by `present()` rather than carried as `undefined`,
      // so `applyBrandAccent` sees a block with no field and leaves the theme
      // files' dial standing.
      expect(resolved.brand).toEqual({ name: ORG_NAME })
      // A section is present because the default NAMES `content`, and empty
      // because the field it names is undefined here. Nothing reads the
      // difference — every reader reaches a field through `?.`, and
      // `useWorkspaceTitle` falls through an empty section to `brand.name`.
      expect(resolved.content).toEqual({})
      expect(resolved.agent).toBeUndefined()
    }
  })

  it('a brand override keeps the fields it does not restate', () => {
    const resolved = resolveDeploymentConfig({ brand: { logo: '/mark.svg' } })
    expect(resolved.brand).toEqual({ name: ORG_NAME, logo: '/mark.svg' })
  })

  it('a named brand wins over the default name', () => {
    expect(resolveDeploymentConfig({ brand: { name: 'Acme' } }).brand.name).toBe(
      'Acme',
    )
  })

  it('an explicit undefined field means "nothing to say", not "erase"', () => {
    const resolved = resolveDeploymentConfig({
      brand: { name: undefined, logo: '/mark.svg' },
    })
    expect(resolved.brand.name).toBe(ORG_NAME)
    expect(resolved.brand.logo).toBe('/mark.svg')
  })

  it('an overlay section is carried through, over an empty default or none', () => {
    const resolved = resolveDeploymentConfig({
      content: { workspaceTitle: 'Board' },
      agent: { enabledTools: ['get_cell'] },
    })
    expect(resolved.content).toEqual({ workspaceTitle: 'Board' })
    expect(resolved.agent).toEqual({ enabledTools: ['get_cell'] })
  })

  it('never aliases the host object or the module default', () => {
    const tools = ['get_cell']
    const config: DeploymentConfig = {
      brand: { name: 'Acme' },
      agent: { enabledTools: tools },
    }
    const resolved = resolveDeploymentConfig(config)

    expect(resolved.brand).not.toBe(config.brand)
    expect(resolved.brand).not.toBe(asbDefaultConfig.brand)
    expect(resolved.agent).not.toBe(config.agent)
    expect(resolved.agent?.enabledTools).not.toBe(tools)

    tools.push('update_cell')
    resolved.brand.name = 'Mutated'
    expect(resolved.agent?.enabledTools).toEqual(['get_cell'])
    expect(asbDefaultConfig.brand?.name).toBe(ORG_NAME)
    expect(config.brand?.name).toBe('Acme')
  })
})
