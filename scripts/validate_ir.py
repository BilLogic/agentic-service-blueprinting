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

  Structure   — required fields, types, enums (view_type/path_type/link
                type), key/locale/role patterns, locale-map shape,
                additionalProperties: false.
  Integrity   — every cell's (path, layer, step) references exist; a cell's
                step must be in that path's path_steps (previewing the DB
                cells_validate_path_match trigger, which would otherwise
                abort mid-import); no duplicate steps in path_steps
                (duplicate column_position); triggers reference existing
                cells on the SAME path (cross-path triggers are invalid);
                source != target; unique keys at every level;
                phase.loops_to resolves.
  Warnings    — unknown layer roles near a canonical role ("did you
                mean…?" via edit distance; genuinely custom roles are legal
                and pass silently); role-less layers whose display name
                looks like it wanted a canonical role (legacy-name shim
                candidates, incl. a small CJK map); locale-coverage gaps in
                localeText fields; scale soft-warnings (>20 layers or
                >30 steps per path) — never caps.

Diagnostics are human-readable, one per line, with file:jsonpath locations:

    ERROR sample-ir.json:$.lifecycle.phases[0].scenarios[0].paths[1].cells[3] — …
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

# ---------------------------------------------------------------------------
# Vocabulary (mirrors references/ir-schema.json + references/layer-roles.md)
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
# role-less layers (see references/layer-roles.md, legacy name shim).
CJK_NAME_TO_ROLE = {
    "前台技术": "frontstage_tech",
    "后台技术": "backstage_tech",
    "客户行为": "customer_actions",
    "顾客行为": "customer_actions",
    "支持系统": "support_systems",
    "前台行为": "frontstage_actions",
    "后台行为": "backstage_actions",
}

VIEW_TYPES = ("single", "side-by-side", "integrated")
PATH_TYPES = ("happy", "unhappy", "exception", "alternative")
LINK_TYPES = ("url", "tech_description")

KEY_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,63}$")
LOCALE_RE = re.compile(r"^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$")
ROLE_RE = re.compile(r"^[a-z0-9][a-z0-9_]*$")

SCALE_MAX_LAYERS = 20
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


def check_link(link, jp: str, rep: Report, locales: list) -> None:
    if not isinstance(link, dict):
        rep.error(jp, f"link must be an object, got {type_name(link)}")
        return
    check_extra_keys(link, {"type", "label", "url", "description", "picture", "pictures"}, jp, rep)
    link_type = check_enum(link, "type", LINK_TYPES, jp, rep)
    check_locale_text(link.get("label"), f"{jp}.label", rep, locales, True, "label")
    if link_type == "url" and "url" not in link:
        rep.error(jp, "links of type 'url' require a 'url' field")
    if "url" in link:
        url = link["url"]
        if not isinstance(url, str) or not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", url):
            rep.error(f"{jp}.url", f"'url' must be a URI string, got {url!r}")
    if "description" in link:
        check_locale_text(link["description"], f"{jp}.description", rep, locales, False, "description")
    if "picture" in link and not isinstance(link["picture"], str):
        rep.error(f"{jp}.picture", "'picture' must be a string")
    if "pictures" in link:
        if not isinstance(link["pictures"], list) or any(not isinstance(p, str) for p in link["pictures"]):
            rep.error(f"{jp}.pictures", "'pictures' must be an array of strings")


def check_cell_ref(ref, jp: str, rep: Report):
    """Return (layer_key, step_key) or None."""
    if not isinstance(ref, dict):
        rep.error(jp, f"cell reference must be an object {{layer, step}}, got {type_name(ref)}")
        return None
    check_extra_keys(ref, {"layer", "step"}, jp, rep)
    layer = check_key(ref.get("layer"), f"{jp}.layer", rep) if "layer" in ref else None
    step = check_key(ref.get("step"), f"{jp}.step", rep) if "step" in ref else None
    if "layer" not in ref:
        rep.error(jp, "missing required field 'layer'")
    if "step" not in ref:
        rep.error(jp, "missing required field 'step'")
    if layer is None or step is None:
        return None
    return layer, step


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


def validate_layer(layer, jp: str, rep: Report, locales: list, rows_seen: dict):
    if not isinstance(layer, dict):
        rep.error(jp, f"layer must be an object, got {type_name(layer)}")
        return None
    check_extra_keys(layer, {"key", "display_name", "role", "row"}, jp, rep)
    key = check_key(layer.get("key"), f"{jp}.key", rep) if "key" in layer else rep.error(jp, "missing required field 'key'")
    check_locale_text(layer.get("display_name"), f"{jp}.display_name", rep, locales, True, "display_name")
    row = check_int(layer, "row", jp, rep, required=True)
    if row is not None:
        if row in rows_seen:
            rep.warn(f"{jp}.row", f"duplicate row {row} on this path (also used by layer '{rows_seen[row]}')")
        else:
            rows_seen[row] = layer.get("key")

    role = layer.get("role")
    if "role" in layer and role is not None:
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
        # Role-less layer: warn when the display name looks like it wanted a
        # canonical role (the legacy magic-name contract — see layer-roles.md).
        display = layer.get("display_name")
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
                        f"layer '{layer.get('key')}' has no role but its display name "
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
        {"layer", "step", "content", "description", "picture", "links",
         "provenance", "needs_review", "evidence", "attribution"},
        jp, rep,
    )
    for field in ("layer", "step"):
        if field not in cell:
            rep.error(jp, f"missing required field '{field}'")
    layer = check_key(cell.get("layer"), f"{jp}.layer", rep) if "layer" in cell else None
    step = check_key(cell.get("step"), f"{jp}.step", rep) if "step" in cell else None
    if "content" in cell:
        check_locale_text(cell["content"], f"{jp}.content", rep, locales, False, "content")
    if "description" in cell:
        check_locale_text(cell["description"], f"{jp}.description", rep, locales, False, "description")
    if "picture" in cell and not isinstance(cell["picture"], str):
        rep.error(f"{jp}.picture", "'picture' must be a string")
    if "links" in cell:
        if not isinstance(cell["links"], list):
            rep.error(f"{jp}.links", "'links' must be an array")
        else:
            for i, link in enumerate(cell["links"]):
                check_link(link, f"{jp}.links[{i}]", rep, locales)
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
    if layer and step:
        return layer, step
    return None


def validate_path(path, jp: str, rep: Report, locales: list, scenario_step_keys: set,
                  paths_seen: dict):
    if not isinstance(path, dict):
        rep.error(jp, f"path must be an object, got {type_name(path)}")
        return
    check_extra_keys(
        path,
        {"key", "name", "description", "note", "path_type", "variant_label",
         "layers", "path_steps", "cells", "triggers"},
        jp, rep,
    )
    path_key = check_key(path.get("key"), f"{jp}.key", rep) if "key" in path else None
    if "key" not in path:
        rep.error(jp, "missing required field 'key'")
    check_unique("path", path_key, paths_seen, f"{jp}.key", rep)
    check_locale_text(path.get("name"), f"{jp}.name", rep, locales, True, "name")
    for optional in ("description", "note", "variant_label"):
        if optional in path:
            check_locale_text(path[optional], f"{jp}.{optional}", rep, locales, False, optional)
    check_enum(path, "path_type", PATH_TYPES, jp, rep)

    # Layers -----------------------------------------------------------------
    layer_keys: set = set()
    layers = path.get("layers")
    if not isinstance(layers, list) or not layers:
        rep.error(f"{jp}.layers", "'layers' must be a non-empty array")
        layers = []
    layers_seen: dict = {}
    rows_seen: dict = {}
    for i, layer in enumerate(layers):
        key = validate_layer(layer, f"{jp}.layers[{i}]", rep, locales, rows_seen)
        check_unique("layer", key, layers_seen, f"{jp}.layers[{i}].key", rep)
        if key:
            layer_keys.add(key)
    if len(layers) > SCALE_MAX_LAYERS:
        rep.warn(f"{jp}.layers", f"path '{path_key}' has {len(layers)} layers (> {SCALE_MAX_LAYERS}) — renders, but consider splitting the scenario (soft warning, never a cap)")

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
                f"duplicate step '{key}' in path_steps (column_position {i} duplicates "
                f"column_position {seen_steps[key]}; array index = column_position, so each step may appear once)",
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
        layer_key, step_key = pair
        cjp = f"{jp}.cells[{i}]"
        if pair in cell_pairs:
            rep.error(cjp, f"duplicate cell (layer '{layer_key}', step '{step_key}') — first declared at {cell_pairs[pair]}")
            continue
        cell_pairs[pair] = cjp
        if layer_key not in layer_keys:
            rep.error(f"{cjp}.layer", f"cell references unknown layer '{layer_key}' on path '{path_key}'")
        if step_key not in scenario_step_keys:
            rep.error(f"{cjp}.step", f"cell references unknown scenario step '{step_key}'")
        elif step_key not in path_step_set:
            rep.error(
                f"{cjp}.step",
                f"cell (layer '{layer_key}', step '{step_key}') references step '{step_key}' "
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
        check_extra_keys(trigger, {"source", "target"}, tjp, rep)
        for field in ("source", "target"):
            if field not in trigger:
                rep.error(tjp, f"missing required field '{field}'")
        source = check_cell_ref(trigger.get("source"), f"{tjp}.source", rep) if "source" in trigger else None
        target = check_cell_ref(trigger.get("target"), f"{tjp}.target", rep) if "target" in trigger else None
        if source is None or target is None:
            continue
        if source == target:
            rep.error(tjp, f"trigger source equals target (layer '{source[0]}', step '{source[1]}') — self-triggers are invalid")
            continue
        if (source, target) in trigger_pairs:
            rep.error(tjp, f"duplicate trigger {source} -> {target} — first declared at {trigger_pairs[(source, target)]}")
        else:
            trigger_pairs[(source, target)] = tjp
        for end_name, (layer_key, step_key) in (("source", source), ("target", target)):
            if (layer_key, step_key) not in cell_pairs:
                rep.error(
                    f"{tjp}.{end_name}",
                    f"trigger {end_name} references cell (layer '{layer_key}', step '{step_key}') "
                    f"which does not exist on path '{path_key}' — triggers must connect two cells "
                    "on the SAME path (cross-path triggers are invalid)",
                )


def validate_scenario(scenario, jp: str, rep: Report, locales: list, scenarios_seen: dict):
    if not isinstance(scenario, dict):
        rep.error(jp, f"scenario must be an object, got {type_name(scenario)}")
        return
    check_extra_keys(scenario, {"key", "name", "description", "order", "view_type", "steps", "paths"}, jp, rep)
    key = check_key(scenario.get("key"), f"{jp}.key", rep) if "key" in scenario else None
    if "key" not in scenario:
        rep.error(jp, "missing required field 'key'")
    check_unique("scenario", key, scenarios_seen, f"{jp}.key", rep)
    check_locale_text(scenario.get("name"), f"{jp}.name", rep, locales, True, "name")
    if "description" in scenario:
        check_locale_text(scenario["description"], f"{jp}.description", rep, locales, False, "description")
    check_int(scenario, "order", jp, rep, required=True)
    check_enum(scenario, "view_type", VIEW_TYPES, jp, rep)

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


def validate_document(doc, rep: Report) -> None:
    if not isinstance(doc, dict):
        rep.error("$", f"IR root must be an object, got {type_name(doc)}")
        return
    check_extra_keys(doc, {"schema_version", "locales", "lifecycle"}, "$", rep)

    if "schema_version" not in doc:
        rep.error("$", "missing required field 'schema_version'")
    elif not isinstance(doc["schema_version"], str):
        rep.error("$.schema_version", f"'schema_version' must be a string, got {type_name(doc['schema_version'])}")

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

    lifecycle = doc.get("lifecycle")
    if lifecycle is None:
        rep.error("$", "missing required field 'lifecycle'")
        return
    jp = "$.lifecycle"
    if not isinstance(lifecycle, dict):
        rep.error(jp, f"'lifecycle' must be an object, got {type_name(lifecycle)}")
        return
    check_extra_keys(lifecycle, {"key", "name", "description", "phases"}, jp, rep)
    if "key" not in lifecycle:
        rep.error(jp, "missing required field 'key'")
    else:
        check_key(lifecycle["key"], f"{jp}.key", rep)
    check_locale_text(lifecycle.get("name"), f"{jp}.name", rep, locales, True, "name")
    if "description" in lifecycle:
        check_locale_text(lifecycle["description"], f"{jp}.description", rep, locales, False, "description")

    phases = lifecycle.get("phases")
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
        check_extra_keys(phase, {"key", "name", "description", "order", "loops_to", "scenarios"}, pjp, rep)
        phase_key = check_key(phase.get("key"), f"{pjp}.key", rep) if "key" in phase else None
        if "key" not in phase:
            rep.error(pjp, "missing required field 'key'")
        check_unique("phase", phase_key, phases_seen, f"{pjp}.key", rep)
        if phase_key:
            phase_keys.add(phase_key)
        check_locale_text(phase.get("name"), f"{pjp}.name", rep, locales, True, "name")
        if "description" in phase:
            check_locale_text(phase["description"], f"{pjp}.description", rep, locales, False, "description")
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
