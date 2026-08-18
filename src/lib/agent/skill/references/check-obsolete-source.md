# check: obsolete-source
wave: 1
severity-default: warn

## Question
Which cells model a surface, system, or flow that no longer exists in the
source it was mapped from?

## Read
Cells carrying `links` that point into a codebase, internal tool, or
document tree — plus any cell whose content names a concrete surface (a
portal, an app screen, a servlet, a form). When the workspace has access
to the source (a repo checkout, a reachable URL), resolve each link: a
path absent from the current tree, a 404ing internal URL, or a screen the
current build no longer ships is the signal. Without source access, flag
only cells whose own evidence contradicts them (e.g. a newer cited doc
says the surface was retired) and report the rest as unverifiable, not
clean.

## Finding shape
One finding per dead surface (grouped across cells), cell_keys = every
cell built on it. The note names the surface, the evidence it is gone
(missing path, retired doc, dead URL), and the blast radius — whether the
dead surface is one stray step or the spine of a whole scenario. A
scenario built entirely on a dead surface is one finding at the scenario
level, not N per-cell findings.

## Non-findings
Planned or future-state paths (a surface that does not exist YET is the
point of a `planned` path, not rot); links that fail for access reasons
(auth walls, network) rather than absence; renamed-but-live surfaces when
the rename is traceable — those are a relink suggestion in the note, not
an obsolete-source finding. This check flags modeling of the PAST, never
modeling of the intended future.
