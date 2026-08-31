#!/usr/bin/env python3
"""Carry a Service Blueprint IR forward across schema-version bumps.

Usage:
    python3 scripts/migrate_ir.py <ir-file> [--to <version>] \\
        [--workspace <blueprint-workspace.json>] [--write] [--json]

Exit codes:
    0 — the IR is already at the target version, or a migration path exists
        (and was applied, with --write)
    1 — the file could not be read, or no migration path reaches the target

The IR states the shape it was authored against in its own `schema_version`
field, and `scripts/validate_ir.py` refuses a file that is not at the version
this template speaks. This script is the other half of that refusal: the
named way to move a file the refusal is about.

⚠ THE VERSIONING RULE: every schema_version bump ships its migration in the
same change. A version that lands in the enum in `references/ir-schema.json`
without a step here is a bump that tells consumers they are out of date and
gives them nothing to run — and consumers have hand-signed-off data riding on
the IR, so re-authoring is not an available answer.

Migrations are chained: a file two bumps behind is carried through both steps
in IR order, so a step only ever has to know about its own predecessor.

## Sign-off hashes

Sign-off binds to a SHA-256 of a scenario's subtree (see
scripts/compute_signoff_hash.py and skills/map/references/workspace-state.md).
Renaming a field inside a scenario changes that subtree, so a recorded hash
does NOT survive a bump that touches scenario content — the 2026.07.16 →
2026.08.25 bump renames `description` → `summary`, `layers` → `lanes` and
`layer` → `lane`, all of which live under a scenario.

A bump does not HAVE to touch the subtree, and the cheapest sign-off answer is
to design one that does not. 2026.08.25 → 2026.08.26 adds an optional `kind` to
a dependency edge whose absence means exactly what every existing edge already
meant, so the step writes nothing into the tree: every scenario hashes to the
byte-identical digest afterwards and `--workspace` reports each one as already
anchored. Materializing the default into every edge would have been
content-preserving too — no authored value would have moved — but it would have
changed every signed scenario's hash for no gain, and made sign-off survival
depend on the operator remembering `--workspace`.

2026.08.26 → 2026.08.27 writes nothing either, and for a reason worth keeping
separate: the table it renamed was never in the IR. Only the stamp moves. Two
consecutive no-op hops is not a sign the versioning is idle — it is what a
schema version costs when the schema and the interchange format are allowed to
move independently, which is the arrangement that keeps sign-off cheap.

Rather than silently de-sign every scenario an org already approved, `--workspace`
re-anchors the recorded hashes: for each scenario whose stored `content_hash`
equals its PRE-migration hash, the stored hash is replaced with its
POST-migration hash and `signed_at`/`signed_by` are kept. That is sound
precisely because a migration step moves no authored VALUE — it renames a
field name, or materializes a defaulted one — and unsound the moment a step
starts editing content, so a step that does must say so and this script
refuses to re-anchor it (`content_preserving = False`).

A stored hash that matches NEITHER side was already stale before the
migration ran: the scenario was hand-edited after it was signed. Those are
reported and left alone — repairing them is a re-review, not a rename.

`targets[*].last_import.content_hash` is deliberately untouched. The upgrade
recipe (references/customization.md) re-imports after a bump anyway, and a
last-import record is a claim about what a target actually holds; rewriting
it would be a lie about a database this script cannot see.

Stdlib only, like every script in this directory. Loads via
validate_ir.load_ir (JSON native; YAML only if PyYAML is importable).
"""

from __future__ import annotations

import argparse
import copy
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import compute_signoff_hash  # noqa: E402
import validate_ir  # noqa: E402


# ---------------------------------------------------------------------------
# Steps
# ---------------------------------------------------------------------------


def rename(obj, old: str, new: str) -> None:
    """Rename a key in place, preserving its position among its siblings.

    `obj[new] = obj.pop(old)` would move the field to the end of the object,
    which is a diff on every line between it and the end of the file for a
    format humans hand-edit and review.
    """
    if not isinstance(obj, dict) or old not in obj:
        return
    items = [(new if k == old else k, v) for k, v in obj.items()]
    obj.clear()
    obj.update(items)


def to_2026_08_25(doc: dict) -> None:
    """2026.07.16 → 2026.08.25 — the lane-vocabulary renames.

    Ten renames landed in the database (see the migrations in the
    21000101000000–21000109000000 band); five of them are visible in the IR:

        $.lifecycle                 → $.service
        <path>.layers               → lanes
        <cell>.layer, <cellref>.layer → lane
        description                 → summary, on service, phase, scenario,
                                      path and cell

    `description` on a LINK payload is deliberately not renamed: a link's
    description is prose about the link, and the schema still calls it
    `description`. That is why this walks the tree by shape instead of
    rewriting the text of the file — a global rename would take the links
    with it.
    """
    rename(doc, "lifecycle", "service")
    service = doc.get("service")
    if not isinstance(service, dict):
        return
    rename(service, "description", "summary")
    for phase in service.get("phases", []) or []:
        rename(phase, "description", "summary")
        for scenario in phase.get("scenarios", []) or []:
            rename(scenario, "description", "summary")
            for path in scenario.get("paths", []) or []:
                rename(path, "description", "summary")
                rename(path, "layers", "lanes")
                for cell in path.get("cells", []) or []:
                    rename(cell, "description", "summary")
                    rename(cell, "layer", "lane")
                for trigger in path.get("triggers", []) or []:
                    if isinstance(trigger, dict):
                        rename(trigger.get("source"), "layer", "lane")
                        rename(trigger.get("target"), "layer", "lane")


class Step:
    """One version-to-version hop.

    `content_preserving` is the sign-off contract: True means the step moves no
    authored VALUE — it renames a field name, or writes a field whose value is
    the default the absent field already meant — so what a signer approved is
    still what the file says, and the recorded hash may be re-anchored onto the
    migrated subtree. A step that edits, drops or synthesizes authored values
    must set it False — then sign-off is a human decision again and this script
    will not make it silently.

    True is not a claim that the hash is unchanged. A rename changes the
    subtree and therefore the hash, which is exactly why `--workspace` exists;
    a step that writes nothing (2026.08.25 → 2026.08.26) leaves the hash alone
    and re-anchoring reports it as already anchored. Both are content-
    preserving; only one needs the re-anchor to do any work.
    """

    def __init__(self, from_version: str, to_version: str, summary: str,
                 apply, content_preserving: bool = True) -> None:
        self.from_version = from_version
        self.to_version = to_version
        self.summary = summary
        self.apply = apply
        self.content_preserving = content_preserving


def to_2026_08_26(doc: dict) -> None:
    """2026.08.25 → 2026.08.26 — dependency edges gain `kind`.

    Nothing to do, and the nothing is the point.

    The database has stored `cell_dependencies.kind in ('trigger','needs')`
    since 20260729120000 and the app has read both kinds all along; the IR
    was the half that could not say `needs`, so a needs edge was silently
    dropped on export and could not survive a re-import. 2026.08.26 gives the
    edge a `kind` field — OPTIONAL, defaulting to 'trigger', which is the
    column default and the meaning every edge authored before this bump
    already had.

    So a 2026.08.25 file is already a valid 2026.08.26 file. Writing
    `"kind": "trigger"` into every edge would say the same thing at greater
    length, change every signed scenario's content hash, and put every
    existing blueprint one forgotten `--workspace` away from de-signing
    itself. The version stamp is the whole migration; `migrate_document`
    applies it.
    """


def to_2026_08_27(doc: dict) -> None:
    """2026.08.26 → 2026.08.27 — `propositions` became `business_model`.

    Nothing to do, for a different reason than the last no-op.

    2026.08.26 wrote nothing because the field it added was optional and its
    absence already meant the default. This one writes nothing because the
    table it renamed is not in the IR at all: `business_model` holds one
    record per service and is authored at RUNTIME by the sb:* skills, like
    slices, findings and evidence. The IR carries the blueprint — phases,
    scenarios, paths, cells, dependencies — and never carried this.

    The version still moves, because the SCHEMA moved and the stamp is what a
    target is checked against. A file that says 2026.08.26 would be refused by
    a template speaking 2026.08.27 even though the two documents are byte-
    identical apart from the stamp, which is exactly what this step exists to
    fix.
    """


def to_2026_08_31(doc: dict) -> None:
    """2026.08.27 → 2026.08.31 — `links` splits into `resources` and
    `touchpoints`.

    A cell's `links` array carried two unrelated things under a name that
    described one of them: entries typed `url`, which are what the cell points
    at, and entries typed `tech_description`, which are prose, screenshots and
    a design link about ONE touchpoint used at this cell. The database column
    behind it is now two tables (21000113000000), and this is the same split
    one layer up, where an author writes.

    Field by field:

        {type: url, label, url}                  → resources[]: {name, url}
        {type: tech_description, label,
         description, picture, pictures, url}    → touchpoints[]: {name,
                                                    summary, screenshots, url}

    `label` becomes `name` because both objects name a thing a reader
    navigates to. `description` becomes `summary` on a TOUCHPOINT for the
    reason 2026.08.25 renamed it everywhere else — it is the one-line précis
    of the thing, and 2026.08.25 spared it only because a link's description
    was prose about the link rather than about a touchpoint. `picture` and
    `pictures` become one `screenshots` array, which is what the two fields
    were always describing: the reader already preferred `pictures` when both
    were set, so folding them loses nothing and stops a second answer.

    CONTENT-PRESERVING. Every authored value survives under a new name, in the
    same order, and nothing is synthesized: an entry with no `type` is left
    alone below rather than guessed at, so a file this step cannot read fails
    validation with its content intact rather than passing with content this
    script invented. The discriminator `type` is the one field that stops
    existing, and it is not an authored value — it is the array membership the
    two new arrays now say structurally.
    """
    service = doc.get("service")
    if not isinstance(service, dict):
        return
    for phase in service.get("phases", []) or []:
        for scenario in phase.get("scenarios", []) or []:
            for path in scenario.get("paths", []) or []:
                for cell in path.get("cells", []) or []:
                    _split_links(cell)


def _split_links(cell) -> None:
    if not isinstance(cell, dict) or "links" not in cell:
        return
    links = cell.pop("links")
    if not isinstance(links, list):
        # Left where the validator will find it: a `links` value that is not
        # an array is not something this step can read, and inventing an empty
        # array in its place would hide the file that needs a person.
        cell["links"] = links
        return

    resources: list = []
    touchpoints: list = []
    unreadable: list = []
    for link in links:
        if not isinstance(link, dict):
            unreadable.append(link)
            continue
        if link.get("type") == "url":
            resource = {"name": link.get("label")}
            if "url" in link:
                resource["url"] = link["url"]
            resources.append(resource)
        elif link.get("type") == "tech_description":
            touchpoint = {"name": link.get("label")}
            if "description" in link:
                touchpoint["summary"] = link["description"]
            screenshots = [
                shot
                for shot in (link.get("pictures") or [link.get("picture")])
                if isinstance(shot, str) and shot.strip()
            ]
            if screenshots:
                touchpoint["screenshots"] = screenshots
            if "url" in link:
                touchpoint["url"] = link["url"]
            touchpoints.append(touchpoint)
        else:
            unreadable.append(link)

    if resources:
        cell["resources"] = resources
    if touchpoints:
        cell["touchpoints"] = touchpoints
    if unreadable:
        cell["links"] = unreadable


def to_2026_09_01(doc: dict) -> None:
    """2026.08.31 → 2026.09.01 — the two dependency kinds, and one of them turns.

    `trigger` becomes `leads_to` and `needs` becomes `enables`, matching
    21000114000000. The first is a rename. The second is not:

        A needs   B   →  B comes first, B is required by A
        A enables B   →  A comes first, A makes B possible

    So every `needs` edge has its `source` and `target` exchanged as its kind
    is rewritten. An edge left where it lay would claim the exact reverse of
    what its author wrote. This is the only migration step in this file that
    moves authored content rather than a stamp, which is why it is also the
    only one that can change a scenario's content hash — a workspace holding
    signed `needs` edges re-signs those scenarios, and that is correct: the
    bytes really did change.

    `trigger` edges are rewritten in place because a rename cannot move a
    meaning. An edge with NO kind is left alone: absence meant the drawn kind
    before this bump and still does, so a file full of bare edges migrates by
    its stamp and hashes identically.
    """
    service = doc.get("service")
    if not isinstance(service, dict):
        return
    for phase in service.get("phases", []) or []:
        for scenario in phase.get("scenarios", []) or []:
            for path in scenario.get("paths", []) or []:
                for edge in path.get("triggers", []) or []:
                    if not isinstance(edge, dict):
                        continue
                    kind = edge.get("kind")
                    if kind == "trigger":
                        edge["kind"] = "leads_to"
                    elif kind == "needs":
                        edge["source"], edge["target"] = (
                            edge.get("target"),
                            edge.get("source"),
                        )
                        edge["kind"] = "enables"


STEPS = (
    Step(
        "2026.07.16",
        "2026.08.25",
        "lane vocabulary: lifecycle→service, layers→lanes, layer→lane, "
        "description→summary",
        to_2026_08_25,
    ),
    Step(
        "2026.08.25",
        "2026.08.26",
        "dependency edges gain an optional `kind` (trigger | needs); absent "
        "means trigger, so no authored content moves",
        to_2026_08_26,
    ),
    Step(
        "2026.08.26",
        "2026.08.27",
        "propositions became business_model; the table is runtime output and "
        "was never in the IR, so only the stamp moves",
        to_2026_08_27,
    ),
    Step(
        "2026.08.27",
        "2026.08.31",
        "a cell's `links` array splits into `resources` and `touchpoints`; "
        "label→name, description→summary, picture/pictures→screenshots",
        to_2026_08_31,
    ),
    Step(
        "2026.08.31",
        "2026.09.01",
        "dependency kinds: trigger→leads_to, and needs→enables with the edge "
        "turned around, because the two words put the source at opposite ends",
        to_2026_09_01,
    ),
)


def current_version() -> str | None:
    """The version this template speaks — the newest in the schema's enum."""
    known = validate_ir.supported_schema_versions()
    return known[0] if known else None


def migration_path(from_version: str, to_version: str) -> list | None:
    """The steps carrying from_version to to_version, or None if none do."""
    if from_version == to_version:
        return []
    by_from = {step.from_version: step for step in STEPS}
    chain: list = []
    version = from_version
    seen = {version}
    while version != to_version:
        step = by_from.get(version)
        if step is None or step.to_version in seen:
            return None
        chain.append(step)
        version = step.to_version
        seen.add(version)
    return chain


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------


def iter_scenarios(doc: dict):
    """Yield (key, scenario) under either root name, so a PRE-migration file
    can be hashed with the same code as a POST-migration one."""
    root = doc.get("service")
    if not isinstance(root, dict):
        root = doc.get("lifecycle")
    if not isinstance(root, dict):
        return
    for phase in root.get("phases", []) or []:
        for scenario in phase.get("scenarios", []) or []:
            if isinstance(scenario, dict) and "key" in scenario:
                yield scenario["key"], scenario


def scenario_hashes(doc: dict) -> dict:
    return {
        key: compute_signoff_hash.scenario_content_hash(scenario)
        for key, scenario in iter_scenarios(doc)
    }


def migrate_document(doc: dict, chain: list) -> dict:
    """Apply a chain of steps to a copy of doc, returning the migrated copy."""
    migrated = copy.deepcopy(doc)
    for step in chain:
        step.apply(migrated)
        migrated["schema_version"] = step.to_version
    return migrated


def reanchor_workspace(workspace: dict, before: dict, after: dict,
                       to_version: str) -> list:
    """Move each signed scenario's recorded hash onto its migrated subtree.

    Mutates `workspace`. Returns one report line per scenario it looked at.
    """
    notes: list = []
    workspace["schema_version"] = to_version
    scenarios = workspace.get("scenarios")
    if not isinstance(scenarios, dict):
        return notes
    for key, entry in scenarios.items():
        if not isinstance(entry, dict):
            continue
        recorded = entry.get("content_hash")
        if not recorded:
            continue
        if key not in before:
            notes.append(f"  {key}: signed, but absent from the IR — left alone")
            continue
        if recorded == after[key]:
            notes.append(f"  {key}: already anchored to the migrated subtree")
        elif recorded == before[key]:
            entry["content_hash"] = after[key]
            notes.append(f"  {key}: re-anchored {recorded} -> {after[key]}")
        else:
            notes.append(
                f"  {key}: recorded hash matches neither the pre- nor the "
                "post-migration subtree — it was already stale before this "
                "migration (hand-edited after sign-off). Left alone; re-review "
                "and re-sign this scenario."
            )
    return notes


def write_json(path: Path, doc: dict) -> None:
    path.write_text(
        json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        description="Carry a Service Blueprint IR forward across schema-version bumps."
    )
    parser.add_argument("ir_file", help="IR file (.json native; .yaml if PyYAML is installed)")
    parser.add_argument("--to", dest="to_version", default=None,
                        help="target schema_version (default: the version this template speaks)")
    parser.add_argument("--workspace", default=None,
                        help="blueprint-workspace.json — re-anchors its sign-off hashes")
    parser.add_argument("--write", action="store_true",
                        help="write the migrated files (default: report the plan only)")
    parser.add_argument("--json", action="store_true",
                        help="print the migrated IR to stdout instead of writing it")
    args = parser.parse_args(argv)

    ir_path = Path(args.ir_file)
    doc, load_error = validate_ir.load_ir(ir_path)
    if load_error is not None:
        print(f"ERROR: {load_error}", file=sys.stderr)
        return 1
    if not isinstance(doc, dict):
        print(f"ERROR: {ir_path} is not an IR document (root is not an object)", file=sys.stderr)
        return 1

    target = args.to_version or current_version()
    if target is None:
        print("ERROR: references/ir-schema.json declares no schema_version enum, "
              "so there is no target to migrate to", file=sys.stderr)
        return 1

    from_version = doc.get("schema_version")
    if not isinstance(from_version, str):
        print(f"ERROR: {ir_path} has no string 'schema_version', so there is no "
              "version to migrate FROM. Add the version the file was authored "
              "against and run this again.", file=sys.stderr)
        return 1

    chain = migration_path(from_version, target)
    if chain is None:
        known = " -> ".join(f"{s.from_version} -> {s.to_version}" for s in STEPS) or "(none)"
        print(f"ERROR: no migration carries {from_version!r} to {target!r}. "
              f"Steps this template ships: {known}. Check out the template "
              "revision that wrote this file, or re-author against "
              f"{target!r}.", file=sys.stderr)
        return 1

    # With --json the migrated IR is the stdout payload, so the human report
    # moves to stderr and the command stays pipeable.
    report = sys.stderr if args.json else sys.stdout

    if not chain:
        print(f"migrate_ir: {ir_path} is already at {target} — nothing to do", file=report)
        return 0

    before = scenario_hashes(doc)
    migrated = migrate_document(doc, chain)
    after = scenario_hashes(migrated)

    print(f"migrate_ir: {ir_path}  {from_version} -> {target}", file=report)
    for step in chain:
        print(f"  step {step.from_version} -> {step.to_version}: {step.summary}", file=report)

    workspace_path = Path(args.workspace) if args.workspace else None
    workspace = None
    if workspace_path is not None:
        workspace, ws_error = validate_ir.load_ir(workspace_path)
        if ws_error is not None:
            print(f"ERROR: {ws_error}", file=sys.stderr)
            return 1
        if not all(step.content_preserving for step in chain):
            print("ERROR: a step in this chain edits authored content, so a "
                  "recorded sign-off hash cannot be moved onto it mechanically. "
                  "Re-review and re-sign the affected scenarios by hand.",
                  file=sys.stderr)
            return 1
        print(f"sign-off hashes in {workspace_path}:", file=report)
        for line in reanchor_workspace(workspace, before, after, target):
            print(line, file=report)

    if args.json:
        print(json.dumps(migrated, ensure_ascii=False, indent=2))
        return 0

    if not args.write:
        print("\nDry run — nothing written. Re-run with --write to apply.", file=report)
        return 0

    write_json(ir_path, migrated)
    print(f"\nwrote {ir_path}", file=report)
    if workspace is not None and workspace_path is not None:
        write_json(workspace_path, workspace)
        print(f"wrote {workspace_path}", file=report)
    print(f"Now run: python3 scripts/validate_ir.py {ir_path}", file=report)
    return 0


if __name__ == "__main__":
    sys.exit(main())
