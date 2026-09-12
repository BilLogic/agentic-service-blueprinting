---
'agentic-service-blueprinting': minor
---

A guard on the theme dials: every dial `themes/light.css` declares,
`themes/dark.css` declares too, and `print.css` restates every dial whose dark
value differs from its light one. A deployment gains the check that would have
caught the surface-hue leak — light's block opens on a bare `:root`, so a dial
dark omits silently becomes dark's value, and dark then runs on a number no
file of its own ever named. It also gains the rule that a dial may not sit in
a shared root block AND in both theme files, where nothing can ever read it.
