# Workspace State: blueprint-workspace.json

The single cross-phase coupling point. Lives at the **workspace root**
(the template clone the org works in), git-tracked, next to the `blueprint/`
IR directory. Enables resume, per-scenario progress, sign-off integrity,
idempotent re-import, and the update loop. The SessionStart hook reads it to
inject a status summary; every phase checks its preconditions against it.

## Shape

```json
{
  "schema_version": "2026.07.16",
  "ir_path": "blueprint/blueprint.yaml",
  "locales": ["en", "zh"],
  "scenarios": {
    "asset-repair": {
      "status": "signed_off",
      "drafted_at": "2026-07-16T10:12:00Z",
      "notes": "reviewer findings 1-4 resolved"
    },
    "energy-audit": { "status": "drafted" }
  },
  "sign_off": {
    "content_hash": "sha256:9f2c…",
    "signed_at": "2026-07-16T11:03:00Z",
    "signed_by": "bill"
  },
  "targets": {
    "en": {
      "mode": "fallback",
      "last_import": { "content_hash": "sha256:9f2c…", "imported_at": "2026-07-16T11:10:00Z" },
      "deploy_url": "https://acme-blueprint-en.netlify.app"
    },
    "zh": {
      "mode": "supabase",
      "project_ref": "abcdefghijklmnop",
      "last_import": null,
      "deploy_url": null
    }
  }
}
```

## Fields

| Field | Meaning |
| --- | --- |
| `schema_version` | Template schema version of the workspace clone. Import compat-checks the IR's `schema_version` against it; mismatch routes to the upgrade recipe in `references/customization.md` |
| `ir_path` | Workspace-relative path to the IR YAML |
| `locales` | Authored locales; one target per locale |
| `scenarios` | **Per-scenario status map**, keyed by IR scenario key — partial completion is a promise ("2 of 6 now, more later") |
| `sign_off` | The hash-bound sign-off gate (below) |
| `targets` | Per-locale import target + deploy record |

### Scenario status values

`pending → drafted → reviewed → signed_off → imported`

- `drafted`: IR content exists and `validate_ir.py` exits 0.
- `reviewed`: `blueprint-reviewer` findings resolved.
- `signed_off`: covered by the current `sign_off.content_hash`.
- `imported`: read-back verification passed on every locale's target.

Statuses give goal-based loops verifiable criteria ("all 6 scenarios
signed off") — update them the moment a phase's exit condition is met,
never speculatively.

### Sign-off (⚠ REQUIRED semantics)

`sign_off.content_hash` is the SHA-256 of the IR file's bytes at the moment
the user explicitly approved the previewed content. Import must recompute the
hash and **refuse on mismatch** — a hand-edit after approval de-signs the
blueprint and re-gates review. Recording the hash without an explicit user
approval defeats the gate; don't.

### Targets

Per locale: `mode` (`fallback` | `supabase`), `project_ref` (Supabase only),
`last_import` (`content_hash` + timestamp of the last verified import — the
baseline for the pre-import read-back diff), `deploy_url` (where this
locale's site lives, once deployed).

## Lifecycle notes

- Create the file when scaffolding the workspace, before any IR is written.
- Two authors collaborate via normal git branching; sign-off is per-branch.
- An inherited workspace (state file present, unknown provenance) is read,
  hash-verified, and resumed — full consistency audit is v2.
- `HANDOFF.md` (generated from `assets/HANDOFF.md.template`) is the
  human-readable companion to this machine-readable state.
