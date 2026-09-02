#!/usr/bin/env python3
"""Validate a Service Blueprint IR file against references/ir-schema.json.

Usage:
    python3 scripts/validate_ir.py <ir-file>

Exit codes:
    0 — IR is valid (warnings, if any, are printed but do not fail)
    1 — IR has errors (or the file could not be read/parsed)

Stdlib only (runs on user machines — no pip installs assumed):
  * .json IR files are read natively.
  * .yaml/.yml IR files are read IF PyYAML happens to be importable
    (`import yaml`); otherwise the validator exits 1 with instructions to
    either install PyYAML or convert the IR to JSON. The IR pipeline treats
    JSON as the always-works interchange format.

What is checked (schema semantics implemented directly — the jsonschema
package is deliberately not required):

  Version     — schema_version must be the version this template speaks (the
                first entry of the enum in references/ir-schema.json). A
                superseded but migratable version is a single error naming
                scripts/migrate_ir.py; the body is not checked, because the
                field names moved and every one of them would be reported as
                an unknown key.
  Structure   — required fields, types, enums (layout/kind/link
                type), key/locale/role patterns, locale-map shape,
                additionalProperties: false.
  Integrity   — every cell's (path, lane, step) references exist; a cell's
                step must be in that path's path_steps (previewing the DB
                cells_validate_path_match trigger, which would otherwise
                abort mid-import); no duplicate steps in path_steps
                (duplicate position); triggers reference existing
                cells on the SAME path (cross-path triggers are invalid);
                source != target; a dependency edge's optional `kind` is
                one of leads_to/enables, and (source, target, kind) is unique
                — the database's own uniqueness key, so one pair may carry
                both an arrow and an enables edge; unique keys at every level;
                phase.loops_to resolves.
  Warnings    — unknown lane roles near a canonical role ("did you
                mean…?" via edit distance; genuinely custom roles are legal
                and pass silently); role-less lanes whose display name
                looks like it wanted a canonical role (legacy-name shim
                candidates, incl. a small CJK map); locale-coverage gaps in
                localeText fields; scale soft-warnings (>20 lanes or
                >30 steps per path) — never caps.

Diagnostics are human-readable, one per line, with file:jsonpath locations:

    ERROR sample-ir.json:$.service.phases[0].scenarios[0].paths[1].cells[3] — …
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

# ---------------------------------------------------------------------------
# Vocabulary (mirrors references/ir-schema.json + references/lane-roles.md)
# ---------------------------------------------------------------------------

CANONICAL_ROLES = (
    "customer_actions",
    "frontstage_actions",
    "backstage_actions",
    "frontstage_tech",
    "backstage_tech",
    "support_systems",
    "visual",
    "step_visual",
)

# Small CJK display-name shim map for the "did you mean role …?" warning on
# role-less lanes (see references/lane-roles.md, legacy name shim).
CJK_NAME_TO_ROLE = {
    "前台技术": "frontstage_tech",
    "后台技术": "backstage_tech",
    "客户行为": "customer_actions",
    "顾客行为": "customer_actions",
    "支持系统": "support_systems",
    "前台行为": "frontstage_actions",
    "后台行为": "backstage_actions",
}

LAYOUTS = ("stacked", "merged")
PATH_KINDS = ("happy", "variant", "exception")
#: resources.kind — the same short list the database checks. Absent means
#: `link`, which is the column default.
RESOURCE_KINDS = ("link", "attachment")
#: cell_touchpoints.role — the two values the database checks; absent means
#: nobody has judged the placement.
TOUCHPOINT_ROLES = ("core", "peripheral")
#: touchpoints.kind — the registry's short list; absent means `other`.
TOUCHPOINT_KINDS = ("app", "document", "physical", "channel", "service", "other")
#: cell_dependencies.kind — the same two values the database checks.
#: An edge that states none is a 'leads_to', which is the column default.
DEPENDENCY_KINDS = ("leads_to", "enables")
DEFAULT_DEPENDENCY_KIND = "leads_to"

KEY_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,63}$")
LOCALE_RE = re.compile(r"^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$")
ROLE_RE = re.compile(r"^[a-z0-9][a-z0-9_]*$")

SCALE_MAX_LANES = 20
SCALE_MAX_STEPS = 30


# ---------------------------------------------------------------------------
# Diagnostics
# ---------------------------------------------------------------------------


class Report:
    def __init__(self, file_label: str) -> None:
        self.file_label = file_label
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def error(self, jsonpath: str, message: str) -> None:
        self.errors.append(f"ERROR {self.file_label}:{jsonpath} — {message}")

    def warn(self, jsonpath: str, message: str) -> None:
        self.warnings.append(f"WARNING {self.file_label}:{jsonpath} — {message}")


# ---------------------------------------------------------------------------
# Loading (.json native; .yaml only if PyYAML is importable)
# ---------------------------------------------------------------------------


def load_ir(path: Path):
    """Return (document, error_message). Exactly one of the two is None."""
    suffix = path.suffix.lower()
    try:
        raw = path.read_text(encoding="utf-8")
    except OSError as exc:
        return None, f"cannot read {path}: {exc}"

    if suffix == ".json":
        try:
            return json.loads(raw), None
        except json.JSONDecodeError as exc:
            return None, f"invalid JSON in {path}: {exc}"

    if suffix in (".yaml", ".yml"):
        try:
            import yaml  # type: ignore
        except ImportError:
            return None, (
                f"{path} is YAML, but PyYAML is not installed and this "
                "validator is stdlib-only.\n"
                "Fallback options:\n"
                "  1. Install PyYAML for this interpreter: "
                "python3 -m pip install pyyaml\n"
                "  2. Or author/convert the IR as JSON (always supported): "
                "e.g. `python3 -c \"import yaml,json,sys; "
                "json.dump(yaml.safe_load(open(sys.argv[1])), "
                "open(sys.argv[2],'w'), ensure_ascii=False, indent=2)\" "
                "in.yaml out.json` on a machine that has PyYAML."
            )
        try:
            return yaml.safe_load(raw), None
        except yaml.YAMLError as exc:  # type: ignore[attr-defined]
            return None, f"invalid YAML in {path}: {exc}"

    return None, (
        f"unsupported IR file extension '{path.suffix}' — expected .json "
        "(native) or .yaml/.yml (requires PyYAML)"
    )


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------


def levenshtein(a: str, b: str) -> int:
    if a == b:
        return 0
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, start=1):
        cur = [i]
        for j, cb in enumerate(b, start=1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def normalize_role_candidate(text: str) -> str:
    text = unicodedata.normalize("NFC", text.strip().lower())
    return re.sub(r"[\s/-]+", "_", text)


def suggest_role(unknown: str) -> str | None:
    """Nearest canonical role when the unknown role looks like a near-miss."""
    normalized = normalize_role_candidate(unknown)
    if normalized in CANONICAL_ROLES:
        return normalized
    best, best_dist = None, 3
    for role in CANONICAL_ROLES:
        dist = levenshtein(normalized, role)
        if dist < best_dist:
            best, best_dist = role, dist
    return best


def type_name(value) -> str:
    return {
        dict: "object", list: "array", str: "string", bool: "boolean",
        int: "integer", float: "number", type(None): "null",
    }.get(type(value), type(value).__name__)


# ---------------------------------------------------------------------------
# Structural checks (hand-implemented ir-schema.json semantics)
# ---------------------------------------------------------------------------


def check_extra_keys(obj: dict, allowed: set, jp: str, rep: Report) -> None:
    for key in obj:
        if key not in allowed:
            rep.error(f"{jp}.{key}", f"unknown field '{key}' (additionalProperties is false)")


def check_key(value, jp: str, rep: Report) -> str | None:
    if not isinstance(value, str):
        rep.error(jp, f"key must be a string, got {type_name(value)}")
        return None
    if not KEY_RE.match(value):
        rep.error(jp, f"key '{value}' does not match ^[a-z0-9][a-z0-9_-]{{0,63}}$")
        return None
    return value


def check_locale_text(value, jp: str, rep: Report, declared_locales: list,
                      required: bool, field: str) -> None:
    if value is None:
        if required:
            rep.error(jp, f"missing required locale-map field '{field}'")
        return
    if not isinstance(value, dict):
        rep.error(jp, f"'{field}' must be a locale map object (e.g. {{\"en\": \"…\"}}), got {type_name(value)}")
        return
    if not value:
        rep.error(jp, f"'{field}' locale map must have at least one entry")
        return
    for locale, text in value.items():
        if not LOCALE_RE.match(str(locale)):
            rep.error(f"{jp}.{locale}", f"'{locale}' is not a valid locale tag")
        if not isinstance(text, str):
            rep.error(f"{jp}.{locale}", f"locale text must be a string, got {type_name(text)}")
    missing = [loc for loc in declared_locales if loc not in value]
    if missing:
        rep.warn(jp, f"'{field}' is missing declared locale(s): {', '.join(missing)}")


def check_int(obj: dict, field: str, jp: str, rep: Report, required: bool, minimum: int = 0):
    if field not in obj:
        if required:
            rep.error(jp, f"missing required field '{field}'")
        return None
    value = obj[field]
    if not isinstance(value, int) or isinstance(value, bool):
        rep.error(f"{jp}.{field}", f"'{field}' must be an integer, got {type_name(value)}")
        return None
    if value < minimum:
        rep.error(f"{jp}.{field}", f"'{field}' must be >= {minimum}, got {value}")
        return None
    return value


def check_enum(obj: dict, field: str, allowed, jp: str, rep: Report) -> str | None:
    if field not in obj:
        rep.error(jp, f"missing required field '{field}'")
        return None
    value = obj[field]
    if value not in allowed:
        rep.error(f"{jp}.{field}", f"'{value}' is not one of {list(allowed)}")
        return None
    return value


def check_uri(value, jp: str, rep: Report) -> None:
    if not isinstance(value, str) or not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", value):
        rep.error(jp, f"'url' must be a URI string, got {value!r}")


def check_resource(resource, jp: str, rep: Report, locales: list) -> None:
    if not isinstance(resource, dict):
        rep.error(jp, f"resource must be an object, got {type_name(resource)}")
        return
    check_extra_keys(resource, {"name", "url", "kind", "featured"}, jp, rep)
    check_locale_text(resource.get("name"), f"{jp}.name", rep, locales, True, "name")
    if "url" not in resource:
        rep.error(jp, "a resource requires a 'url' field")
    elif resource.get("kind") == "attachment":
        # A file the cell points at: a site-relative path shipped with the
        # app, or a URI once it lives in Storage. Either way, non-empty and
        # one token.
        url = resource["url"]
        if not isinstance(url, str) or not url.strip() or any(ch.isspace() for ch in url.strip()):
            rep.error(f"{jp}.url", f"an attachment's 'url' must be a path or URI, got {url!r}")
    else:
        check_uri(resource["url"], f"{jp}.url", rep)
    if "kind" in resource:
        check_enum(resource, "kind", RESOURCE_KINDS, jp, rep)
    if "featured" in resource and not isinstance(resource["featured"], bool):
        rep.error(f"{jp}.featured", f"featured must be a boolean, got {type_name(resource['featured'])}")


def check_registry(entries, jp: str, rep: Report, locales: list) -> None:
    """The service's touchpoint registry: named entries, unique by name
    (case-insensitively, the way the database's fold matches placements)."""
    if not isinstance(entries, list):
        rep.error(jp, "'touchpoints' must be an array")
        return
    seen: dict = {}
    for i, entry in enumerate(entries):
        ejp = f"{jp}[{i}]"
        if not isinstance(entry, dict):
            rep.error(ejp, f"registry touchpoint must be an object, got {type_name(entry)}")
            continue
        check_extra_keys(entry, {"name", "kind", "summary", "url"}, ejp, rep)
        check_locale_text(entry.get("name"), f"{ejp}.name", rep, locales, True, "name")
        if "kind" in entry:
            check_enum(entry, "kind", TOUCHPOINT_KINDS, ejp, rep)
        if "summary" in entry:
            check_locale_text(entry["summary"], f"{ejp}.summary", rep, locales, False, "summary")
        if "url" in entry:
            check_uri(entry["url"], f"{ejp}.url", rep)
        name = entry.get("name")
        if isinstance(name, dict):
            for locale, value in name.items():
                if isinstance(value, str) and value.strip():
                    key = (locale, value.strip().lower())
                    if key in seen:
                        rep.error(f"{ejp}.name", f"duplicate registry name {value!r} ({locale}); see {seen[key]}")
                    seen[key] = ejp


def check_touchpoint(touchpoint, jp: str, rep: Report, locales: list) -> None:
    if not isinstance(touchpoint, dict):
        rep.error(jp, f"touchpoint must be an object, got {type_name(touchpoint)}")
        return
    check_extra_keys(touchpoint, {"name", "summary", "role", "resources"}, jp, rep)
    check_locale_text(touchpoint.get("name"), f"{jp}.name", rep, locales, True, "name")
    if "summary" in touchpoint:
        check_locale_text(touchpoint["summary"], f"{jp}.summary", rep, locales, False, "summary")
    if "role" in touchpoint:
        check_enum(touchpoint, "role", TOUCHPOINT_ROLES, jp, rep)
    if "resources" in touchpoint:
        resources = touchpoint["resources"]
        if not isinstance(resources, list):
            rep.error(f"{jp}.resources", "'resources' must be an array")
        else:
            for i, resource in enumerate(resources):
                check_resource(resource, f"{jp}.resources[{i}]", rep, locales)


def check_cell_ref(ref, jp: str, rep: Report):
    """Return (lane_key, step_key) or None."""
    if not isinstance(ref, dict):
        rep.error(jp, f"cell reference must be an object {{lane, step}}, got {type_name(ref)}")
        return None
    check_extra_keys(ref, {"lane", "step"}, jp, rep)
    lane = check_key(ref.get("lane"), f"{jp}.lane", rep) if "lane" in ref else None
    step = check_key(ref.get("step"), f"{jp}.step", rep) if "step" in ref else None
    if "lane" not in ref:
        rep.error(jp, "missing required field 'lane'")
    if "step" not in ref:
        rep.error(jp, "missing required field 'step'")
    if lane is None or step is None:
        return None
    return lane, step


def check_unique(kind: str, key, seen: dict, jp: str, rep: Report) -> None:
    if key is None:
        return
    if key in seen:
        rep.error(jp, f"duplicate {kind} key '{key}' (first declared at {seen[key]})")
    else:
        seen[key] = jp


# ---------------------------------------------------------------------------
# Entity validators
# ---------------------------------------------------------------------------


def validate_lane(lane, jp: str, rep: Report, locales: list, rows_seen: dict):
    if not isinstance(lane, dict):
        rep.error(jp, f"lane must be an object, got {type_name(lane)}")
        return None
    check_extra_keys(
        lane, {"key", "display_name", "role", "row", "kpis", "tools"}, jp, rep
    )
    key = check_key(lane.get("key"), f"{jp}.key", rep) if "key" in lane else rep.error(jp, "missing required field 'key'")
    check_locale_text(lane.get("display_name"), f"{jp}.display_name", rep, locales, True, "display_name")
    row = check_int(lane, "row", jp, rep, required=True)
    if row is not None:
        if row in rows_seen:
            rep.warn(f"{jp}.row", f"duplicate row {row} on this path (also used by lane '{rows_seen[row]}')")
        else:
            rows_seen[row] = lane.get("key")

    role = lane.get("role")
    if "role" in lane and role is not None:
        if not isinstance(role, str) or not ROLE_RE.match(role):
            rep.error(f"{jp}.role", f"role '{role}' does not match ^[a-z0-9][a-z0-9_]*$")
        elif role not in CANONICAL_ROLES:
            suggestion = suggest_role(role)
            if suggestion:
                rep.warn(
                    f"{jp}.role",
                    f"unknown role '{role}' — did you mean '{suggestion}'? "
                    "(org-defined custom roles are legal; ignore if intentional)",
                )
            # A role far from every canonical role is a legal custom role: silent.
    else:
        # Role-less lane: warn when the display name looks like it wanted a
        # canonical role (the legacy magic-name contract — see lane-roles.md).
        display = lane.get("display_name")
        if isinstance(display, dict):
            for locale, text in display.items():
                if not isinstance(text, str):
                    continue
                normalized = normalize_role_candidate(text)
                candidate = CJK_NAME_TO_ROLE.get(text.strip())
                if candidate is None and normalized in CANONICAL_ROLES:
                    candidate = normalized
                if candidate is None:
                    close = suggest_role(text)
                    if close and levenshtein(normalize_role_candidate(text), close) <= 2:
                        candidate = close
                if candidate:
                    rep.warn(
                        f"{jp}.display_name.{locale}",
                        f"lane '{lane.get('key')}' has no role but its display name "
                        f"'{text}' looks like it wanted one — did you mean role: {candidate}? "
                        "(new IR must set roles explicitly; display-name matching is a legacy shim)",
                    )
                    break
    return key if isinstance(key, str) else None


def validate_cell(cell, jp: str, rep: Report, locales: list):
    if not isinstance(cell, dict):
        rep.error(jp, f"cell must be an object, got {type_name(cell)}")
        return None
    check_extra_keys(
        cell,
        {"lane", "step", "content", "summary", "picture",
         "resources", "touchpoints",
         "provenance", "needs_review", "evidence", "attribution",
         # Spec fields — audit wave 2 reads these; optional everywhere.
         "function", "form", "owner", "perceived_owner", "value_props"},
        jp, rep,
    )
    for field in ("lane", "step"):
        if field not in cell:
            rep.error(jp, f"missing required field '{field}'")
    lane = check_key(cell.get("lane"), f"{jp}.lane", rep) if "lane" in cell else None
    step = check_key(cell.get("step"), f"{jp}.step", rep) if "step" in cell else None
    if "content" in cell:
        check_locale_text(cell["content"], f"{jp}.content", rep, locales, False, "content")
    if "summary" in cell:
        check_locale_text(cell["summary"], f"{jp}.summary", rep, locales, False, "summary")
    if "picture" in cell and not isinstance(cell["picture"], str):
        rep.error(f"{jp}.picture", "'picture' must be a string")
    if "resources" in cell:
        if not isinstance(cell["resources"], list):
            rep.error(f"{jp}.resources", "'resources' must be an array")
        else:
            for i, resource in enumerate(cell["resources"]):
                check_resource(resource, f"{jp}.resources[{i}]", rep, locales)
    if "touchpoints" in cell:
        if not isinstance(cell["touchpoints"], list):
            rep.error(f"{jp}.touchpoints", "'touchpoints' must be an array")
        else:
            names = []
            for i, touchpoint in enumerate(cell["touchpoints"]):
                check_touchpoint(touchpoint, f"{jp}.touchpoints[{i}]", rep, locales)
                if isinstance(touchpoint, dict):
                    names.append(json.dumps(touchpoint.get("name"), sort_keys=True))
            # A cell names a touchpoint once. The table refuses a second row
            # for the same name, so an IR that carries one fails at import
            # rather than here, which is the wrong place to find out.
            if len(set(names)) != len(names):
                rep.error(f"{jp}.touchpoints", "a cell names the same touchpoint twice")
    if "provenance" in cell:
        prov = cell["provenance"]
        if not isinstance(prov, dict):
            rep.error(f"{jp}.provenance", "'provenance' must be an object")
        else:
            check_extra_keys(prov, {"source", "section"}, f"{jp}.provenance", rep)
            if "source" not in prov:
                rep.error(f"{jp}.provenance", "missing required field 'source'")
            for field in ("source", "section"):
                if field in prov and not isinstance(prov[field], str):
                    rep.error(f"{jp}.provenance.{field}", f"'{field}' must be a string")
    if "needs_review" in cell and not isinstance(cell["needs_review"], bool):
        rep.error(f"{jp}.needs_review", "'needs_review' must be a boolean")
    if "evidence" in cell:
        if not isinstance(cell["evidence"], list) or any(not isinstance(e, str) for e in cell["evidence"]):
            rep.error(f"{jp}.evidence", "'evidence' must be an array of strings")
    if "attribution" in cell and not isinstance(cell["attribution"], str):
        rep.error(f"{jp}.attribution", "'attribution' must be a string")
    if lane and step:
        return lane, step
    return None


def validate_path(path, jp: str, rep: Report, locales: list, scenario_step_keys: set,
                  paths_seen: dict):
    if not isinstance(path, dict):
        rep.error(jp, f"path must be an object, got {type_name(path)}")
        return
    check_extra_keys(
        path,
        {"key", "name", "summary", "note", "kind", "variant_label",
         "lanes", "path_steps", "cells", "triggers"},
        jp, rep,
    )
    path_key = check_key(path.get("key"), f"{jp}.key", rep) if "key" in path else None
    if "key" not in path:
        rep.error(jp, "missing required field 'key'")
    check_unique("path", path_key, paths_seen, f"{jp}.key", rep)
    check_locale_text(path.get("name"), f"{jp}.name", rep, locales, True, "name")
    for optional in ("summary", "note", "variant_label"):
        if optional in path:
            check_locale_text(path[optional], f"{jp}.{optional}", rep, locales, False, optional)
    check_enum(path, "kind", PATH_KINDS, jp, rep)

    # Lanes -----------------------------------------------------------------
    lane_keys: set = set()
    lanes = path.get("lanes")
    if not isinstance(lanes, list) or not lanes:
        rep.error(f"{jp}.lanes", "'lanes' must be a non-empty array")
        lanes = []
    lanes_seen: dict = {}
    rows_seen: dict = {}
    for i, lane in enumerate(lanes):
        key = validate_lane(lane, f"{jp}.lanes[{i}]", rep, locales, rows_seen)
        check_unique("lane", key, lanes_seen, f"{jp}.lanes[{i}].key", rep)
        if key:
            lane_keys.add(key)
    if len(lanes) > SCALE_MAX_LANES:
        rep.warn(f"{jp}.lanes", f"path '{path_key}' has {len(lanes)} lanes (> {SCALE_MAX_LANES}) — renders, but consider splitting the scenario (soft warning, never a cap)")

    # path_steps ---------------------------------------------------------------
    path_step_keys: list = []
    path_steps = path.get("path_steps")
    if not isinstance(path_steps, list) or not path_steps:
        rep.error(f"{jp}.path_steps", "'path_steps' must be a non-empty array of scenario step keys")
        path_steps = []
    seen_steps: dict = {}
    for i, step_key in enumerate(path_steps):
        key = check_key(step_key, f"{jp}.path_steps[{i}]", rep)
        if key is None:
            continue
        if key in seen_steps:
            rep.error(
                f"{jp}.path_steps[{i}]",
                f"duplicate step '{key}' in path_steps (position {i} duplicates "
                f"position {seen_steps[key]}; array index = position, so each step may appear once)",
            )
            continue
        seen_steps[key] = i
        if key not in scenario_step_keys:
            rep.error(f"{jp}.path_steps[{i}]", f"path_steps references unknown scenario step '{key}'")
            continue
        path_step_keys.append(key)
    if len(path_steps) > SCALE_MAX_STEPS:
        rep.warn(f"{jp}.path_steps", f"path '{path_key}' has {len(path_steps)} steps (> {SCALE_MAX_STEPS}) — renders, but the grid gets hard to read (soft warning, never a cap)")
    path_step_set = set(path_step_keys)

    # Cells --------------------------------------------------------------------
    cells = path.get("cells")
    if not isinstance(cells, list):
        rep.error(f"{jp}.cells", "'cells' must be an array")
        cells = []
    if "cells" not in path:
        rep.error(jp, "missing required field 'cells'")
    cell_pairs: dict = {}
    for i, cell in enumerate(cells):
        pair = validate_cell(cell, f"{jp}.cells[{i}]", rep, locales)
        if pair is None:
            continue
        lane_key, step_key = pair
        cjp = f"{jp}.cells[{i}]"
        if pair in cell_pairs:
            rep.error(cjp, f"duplicate cell (lane '{lane_key}', step '{step_key}') — first declared at {cell_pairs[pair]}")
            continue
        cell_pairs[pair] = cjp
        if lane_key not in lane_keys:
            rep.error(f"{cjp}.lane", f"cell references unknown lane '{lane_key}' on path '{path_key}'")
        if step_key not in scenario_step_keys:
            rep.error(f"{cjp}.step", f"cell references unknown scenario step '{step_key}'")
        elif step_key not in path_step_set:
            rep.error(
                f"{cjp}.step",
                f"cell (lane '{lane_key}', step '{step_key}') references step '{step_key}' "
                f"which is not in path '{path_key}' path_steps — the DB cells_validate_path_match "
                "trigger would abort this import mid-transaction",
            )

    # Triggers -------------------------------------------------------------------
    triggers = path.get("triggers", [])
    if not isinstance(triggers, list):
        rep.error(f"{jp}.triggers", "'triggers' must be an array")
        triggers = []
    trigger_pairs: dict = {}
    for i, trigger in enumerate(triggers):
        tjp = f"{jp}.triggers[{i}]"
        if not isinstance(trigger, dict):
            rep.error(tjp, f"trigger must be an object, got {type_name(trigger)}")
            continue
        check_extra_keys(trigger, {"source", "target", "kind"}, tjp, rep)
        for field in ("source", "target"):
            if field not in trigger:
                rep.error(tjp, f"missing required field '{field}'")
        source = check_cell_ref(trigger.get("source"), f"{tjp}.source", rep) if "source" in trigger else None
        target = check_cell_ref(trigger.get("target"), f"{tjp}.target", rep) if "target" in trigger else None
        # Absent is 'leads_to' — the column default, and what every edge
        # authored before the kind existed already meant.
        kind = trigger.get("kind", DEFAULT_DEPENDENCY_KIND)
        if kind not in DEPENDENCY_KINDS:
            rep.error(
                f"{tjp}.kind",
                f"{kind!r} is not one of {list(DEPENDENCY_KINDS)} — 'leads_to' makes "
                "the target happen and draws an arrow (the default when the field is "
                "absent); 'enables' makes it possible and renders in the cell panel "
                "only. Both read source-first",
            )
            kind = DEFAULT_DEPENDENCY_KIND
        if source is None or target is None:
            continue
        if source == target:
            rep.error(tjp, f"trigger source equals target (lane '{source[0]}', step '{source[1]}') — self-triggers are invalid")
            continue
        # Uniqueness is (source, target, kind), matching the database's
        # cell_dependencies_source_target_kind_unique: one pair may carry an
        # arrow AND a needs edge, and those are two rows, not a duplicate.
        if (source, target, kind) in trigger_pairs:
            rep.error(
                tjp,
                f"duplicate {kind} edge {source} -> {target} — first declared at "
                f"{trigger_pairs[(source, target, kind)]}",
            )
        else:
            trigger_pairs[(source, target, kind)] = tjp
        for end_name, (lane_key, step_key) in (("source", source), ("target", target)):
            if (lane_key, step_key) not in cell_pairs:
                rep.error(
                    f"{tjp}.{end_name}",
                    f"trigger {end_name} references cell (lane '{lane_key}', step '{step_key}') "
                    f"which does not exist on path '{path_key}' — triggers must connect two cells "
                    "on the SAME path (cross-path triggers are invalid)",
                )


def validate_scenario(scenario, jp: str, rep: Report, locales: list, scenarios_seen: dict):
    if not isinstance(scenario, dict):
        rep.error(jp, f"scenario must be an object, got {type_name(scenario)}")
        return
    check_extra_keys(scenario, {"key", "name", "summary", "order", "layout", "steps", "paths"}, jp, rep)
    key = check_key(scenario.get("key"), f"{jp}.key", rep) if "key" in scenario else None
    if "key" not in scenario:
        rep.error(jp, "missing required field 'key'")
    check_unique("scenario", key, scenarios_seen, f"{jp}.key", rep)
    check_locale_text(scenario.get("name"), f"{jp}.name", rep, locales, True, "name")
    if "summary" in scenario:
        check_locale_text(scenario["summary"], f"{jp}.summary", rep, locales, False, "summary")
    check_int(scenario, "order", jp, rep, required=True)
    check_enum(scenario, "layout", LAYOUTS, jp, rep)

    steps = scenario.get("steps")
    step_keys: set = set()
    if not isinstance(steps, list) or not steps:
        rep.error(f"{jp}.steps", "'steps' must be a non-empty array")
        steps = []
    steps_seen: dict = {}
    for i, step in enumerate(steps):
        sjp = f"{jp}.steps[{i}]"
        if not isinstance(step, dict):
            rep.error(sjp, f"step must be an object, got {type_name(step)}")
            continue
        check_extra_keys(step, {"key", "name"}, sjp, rep)
        step_key = check_key(step.get("key"), f"{sjp}.key", rep) if "key" in step else None
        if "key" not in step:
            rep.error(sjp, "missing required field 'key'")
        check_unique("step", step_key, steps_seen, f"{sjp}.key", rep)
        check_locale_text(step.get("name"), f"{sjp}.name", rep, locales, True, "name")
        if step_key:
            step_keys.add(step_key)

    paths = scenario.get("paths")
    if not isinstance(paths, list) or not paths:
        rep.error(f"{jp}.paths", "'paths' must be a non-empty array")
        paths = []
    paths_seen: dict = {}
    for i, path in enumerate(paths):
        validate_path(path, f"{jp}.paths[{i}]", rep, locales, step_keys, paths_seen)


IR_SCHEMA = Path(__file__).resolve().parent.parent / "references" / "ir-schema.json"


def supported_schema_versions() -> list:
    """The versions this template knows, newest first, from the schema that
    declares them. The FIRST entry is the version this template speaks; the
    rest are versions scripts/migrate_ir.py can carry forward.

    Checking only that the field is a STRING was the whole check for as long as
    the field existed, so an IR authored against a shape the database does not
    have validated cleanly and failed on the first column that had moved. The
    list lives in references/ir-schema.json rather than here, because a second
    copy of a version list is a second thing to forget.

    An unreadable or enum-less schema returns [] and the check is skipped: a
    validator that cannot run without its sibling file would be a worse failure
    than the one it is closing.
    """
    try:
        schema = json.loads(IR_SCHEMA.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    return list(schema.get("properties", {}).get("schema_version", {}).get("enum", []))


def validate_document(doc, rep: Report) -> None:
    if not isinstance(doc, dict):
        rep.error("$", f"IR root must be an object, got {type_name(doc)}")
        return

    if "schema_version" not in doc:
        rep.error("$", "missing required field 'schema_version'")
    elif not isinstance(doc["schema_version"], str):
        rep.error("$.schema_version", f"'schema_version' must be a string, got {type_name(doc['schema_version'])}")
    else:
        known = supported_schema_versions()
        version = doc["schema_version"]
        if known and version not in known:
            rep.error(
                "$.schema_version",
                f"unknown schema_version {version!r}; this template speaks "
                + ", ".join(known)
                + f". No migration carries {version!r} forward "
                "(scripts/migrate_ir.py lists the steps that exist) — check out "
                "the template revision that wrote this file, or re-author "
                f"against {known[0]}.",
            )
            return
        if known and version != known[0]:
            # A bump may move field names, and then continuing here would
            # report every renamed field as an unknown key and bury the one
            # error the reader can act on. Whether the bumps between these two
            # versions did that is migrate_ir.py's business, not this check's:
            # name the migration and stop either way.
            rep.error(
                "$.schema_version",
                f"IR is at schema_version {version}; this template speaks "
                f"{known[0]}. The shape may have moved between them, so the "
                "rest of this file is not checked. Upgrade it with: python3 "
                f"scripts/migrate_ir.py {rep.file_label} --to {known[0]} --write "
                "(add --workspace blueprint-workspace.json to carry sign-off "
                "hashes across; see references/customization.md § Template "
                "upgrade recipe).",
            )
            return

    check_extra_keys(doc, {"schema_version", "locales", "service"}, "$", rep)

    locales: list = []
    if "locales" not in doc:
        rep.error("$", "missing required field 'locales'")
    elif not isinstance(doc["locales"], list) or not doc["locales"]:
        rep.error("$.locales", "'locales' must be a non-empty array of locale tags")
    else:
        seen: dict = {}
        for i, locale in enumerate(doc["locales"]):
            ljp = f"$.locales[{i}]"
            if not isinstance(locale, str) or not LOCALE_RE.match(locale):
                rep.error(ljp, f"'{locale}' is not a valid locale tag (e.g. en, zh, zh-Hant)")
                continue
            check_unique("locale", locale, seen, ljp, rep)
            locales.append(locale)

    service = doc.get("service")
    if service is None:
        rep.error("$", "missing required field 'service'")
        return
    jp = "$.service"
    if not isinstance(service, dict):
        rep.error(jp, f"'service' must be an object, got {type_name(service)}")
        return
    check_extra_keys(service, {"key", "name", "summary", "touchpoints", "phases"}, jp, rep)
    if "key" not in service:
        rep.error(jp, "missing required field 'key'")
    else:
        check_key(service["key"], f"{jp}.key", rep)
    check_locale_text(service.get("name"), f"{jp}.name", rep, locales, True, "name")
    if "summary" in service:
        check_locale_text(service["summary"], f"{jp}.summary", rep, locales, False, "summary")
    if "touchpoints" in service:
        check_registry(service["touchpoints"], f"{jp}.touchpoints", rep, locales)

    phases = service.get("phases")
    if not isinstance(phases, list) or not phases:
        rep.error(f"{jp}.phases", "'phases' must be a non-empty array")
        return
    phases_seen: dict = {}
    phase_keys: set = set()
    loops: list = []
    scenarios_seen: dict = {}
    for i, phase in enumerate(phases):
        pjp = f"{jp}.phases[{i}]"
        if not isinstance(phase, dict):
            rep.error(pjp, f"phase must be an object, got {type_name(phase)}")
            continue
        check_extra_keys(phase, {"key", "name", "summary", "order", "loops_to", "scenarios"}, pjp, rep)
        phase_key = check_key(phase.get("key"), f"{pjp}.key", rep) if "key" in phase else None
        if "key" not in phase:
            rep.error(pjp, "missing required field 'key'")
        check_unique("phase", phase_key, phases_seen, f"{pjp}.key", rep)
        if phase_key:
            phase_keys.add(phase_key)
        check_locale_text(phase.get("name"), f"{pjp}.name", rep, locales, True, "name")
        if "summary" in phase:
            check_locale_text(phase["summary"], f"{pjp}.summary", rep, locales, False, "summary")
        check_int(phase, "order", pjp, rep, required=True)
        if "loops_to" in phase:
            loop_key = check_key(phase["loops_to"], f"{pjp}.loops_to", rep)
            if loop_key:
                loops.append((loop_key, f"{pjp}.loops_to"))
        scenarios = phase.get("scenarios")
        if scenarios is None:
            rep.error(pjp, "missing required field 'scenarios'")
            continue
        if not isinstance(scenarios, list):
            rep.error(f"{pjp}.scenarios", f"'scenarios' must be an array, got {type_name(scenarios)}")
            continue
        for j, scenario in enumerate(scenarios):
            validate_scenario(scenario, f"{pjp}.scenarios[{j}]", rep, locales, scenarios_seen)

    for loop_key, loop_jp in loops:
        if loop_key not in phase_keys:
            rep.error(loop_jp, f"loops_to references unknown phase '{loop_key}'")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def validate_file(path: Path) -> Report:
    rep = Report(path.name)
    doc, load_error = load_ir(path)
    if load_error is not None:
        rep.error("$", load_error)
        return rep
    validate_document(doc, rep)
    return rep


def main(argv: list) -> int:
    if len(argv) != 2 or argv[1] in ("-h", "--help"):
        print(__doc__.strip().splitlines()[0])
        print("\nUsage: python3 scripts/validate_ir.py <ir-file>")
        return 0 if len(argv) == 2 else 1

    path = Path(argv[1])
    rep = validate_file(path)

    for line in rep.errors:
        print(line)
    for line in rep.warnings:
        print(line)

    if rep.errors:
        print(f"\nvalidate_ir: FAIL — {len(rep.errors)} error(s), {len(rep.warnings)} warning(s) in {path}")
        return 1
    if rep.warnings:
        print(f"\nvalidate_ir: OK with {len(rep.warnings)} warning(s) in {path}")
    else:
        print(f"validate_ir: OK — {path} is valid")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
