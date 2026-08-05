# IDE-surface eval findings — 2026-08-05

Two blind subagent runs followed the shipped skills end-to-end on the IDE
surface (file tools + scripts, no human to elicit from; assumptions were
logged per question instead). Both runs PASSED their exit conditions —
map: `validate_ir.py` exit 0 first attempt, 5 steps, spine
`customer_actions`, inferences flagged `needs_review`; slice:
`select → validate` exit 0 first pass, 4 frames, zero cells invented,
import refused on empty `targets`. What follows is every ambiguity the
runs surfaced — each is a skill/docs bug, not an agent bug.

## blueprint (map) skill

1. **Exception-path lane stack is unspecified.** Layers are per-path in
   the IR, so an exception path must re-declare lanes — mirror the happy
   path's full stack, or only the lanes the exception touches? Nothing
   in SKILL.md or the playbooks says. (Run chose minimal.)
2. **`schema_version` has no normative source.** The only place the
   current value (`2026.07.16`) appears is `scripts/tests/sample-ir.json`
   and a workspace-state example. State it in ir-schema.json or SKILL.md.

## slice skill

3. **No sanctioned draft-preview mode.** The entry gate requires a
   signed-off scenario; an IDE user iterating on a `drafted` scenario has
   no skill-legal way to preview a slice. Either bless a "draft slice —
   not importable" mode or say the stop is absolute.
4. **`origin: generated` vs `customized` contradiction.** Playbook §6
   flips origin to `customized` on any hand-edited prose, while §2/§4
   direct the agent to author captions/narrative right after `select` —
   read literally every slice is instantly `customized`. Decide which
   reading is intended.
5. **Named agents don't exist on this surface.** Review/present phases
   reference `blueprint-reviewer` / `render-checker`; the skill should
   say what substitutes when those agents are absent.
6. **`doc` subcommand undocumented.** `slice_tools.py` has four
   subcommands; SKILL.md's pipeline names only select/validate/sql.
7. **Multi-slice file naming unspecified.** Pipeline diagram implies one
   `slices/<key>.json` per slice; `validate`/`sql` accept one `--slices`
   file holding many. Name the convention.
8. **Import is unreachable from an untargeted workspace — implied, never
   stated.** `sql` requires `--lifecycle-id`; with `targets: {}` the
   pipeline cannot reach import. Correct behavior, but SKILL.md should
   say "no target → stop before sql" explicitly (the eval agent had to
   derive it).

## Cross-surface note

The canvas adapter (references/canvas-adapter.md) was corrected in this
same pass: its surface map listed `create_slice` / `duplicate_path`,
which never shipped as canvas tools, and its Q&A exit condition demanded
raw cell ids in prose. Both fixed. Rule of thumb the evals reinforce:
when two surfaces disagree about the same rule, this repo is where the
fix lands.
