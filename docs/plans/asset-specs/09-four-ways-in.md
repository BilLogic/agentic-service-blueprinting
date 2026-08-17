---
title: Asset spec — four-ways-in.svg
type: plan
status: draft-for-review
date: 2026-08-08
asset: docs/assets/four-ways-in.svg
home: guide/02 §2 only
style: 00-style-guide.md governs; annotated-UI motif at mini-scene scale
---

# four-ways-in.svg — one blueprint, four surfaces

## Job

Answers: *where do I — and my agents — actually meet this thing?* Framed
as experience; enforcement is the footnote. uno's live Slack bot is the
proof case for the external way (cite in guide/02 prose, not drawn as a
Slack logo — generic chat surface).

## Canvas

`viewBox="0 -44 880 444"`. Title: **"One blueprint, four ways in"**.

## Layout

- **Row of four mini-scenes** (workflow's 4-column pitch: x=112/304/496/
  688, w=168, h≈150, y=16): each a wireframe vignette in a white rx=8
  card with a `.chip` label beneath and a `.sub` what-for line:
  1. browser window chrome + mini-grid inside — `the app` — "read,
     compare, present"
  2. same window with a narrow dock panel on the right (chat rows) —
     `the in-app agent` — "ask and author, cited to cells" (amber accent
     stroke on the dock only)
  3. IDE-ish window: sidebar + editor + a composer line carrying `.mono`
     `sb:` — `your IDE` — "map and maintain from the repo" (amber accent
     on the composer line)
  4. chat-app surface: message bubbles, one bubble carrying a tiny grid
     thumbnail — `any agent, anywhere` — "query it over MCP, read-only"
     (card border dashed `4 3` = read-only)
- **Foundation bar** (x=16 w=848 h=56 y≈208, rx=12, emphasis tint
  `#d9e4ea`/`#9aadbe`): left-aligned `.title` "the blueprint — structured,
  queryable, one source of truth" + a small mini-grid glyph right-aligned.
  One straight drop-line with marker from each scene into the bar's top
  edge.
- **Footnote** centered `.sub` @10px, two lines (+13px step): "what each
  way may do is enforced below the surface —" / "access tiers, tool
  rosters, and row-level security (see the operations guide)".

## Consistency notes

- The four scenes must be equally weighted — same card size, same label
  treatment; no scene is the hero. The foundation bar is the hero.
- Amber marks agent-capable surfaces only (scenes 2–3); dashes mark
  read-only only (scene 4). No other tint use.
- No product logos, no brand marks in the chat scene — generic bubbles.
- Wireframe fidelity per the annotated-UI motif, but at this scale no
  callout pointers — the label+sub pair does the work.
