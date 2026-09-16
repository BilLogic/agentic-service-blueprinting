---
"agentic-service-blueprinting": patch
---

The `2xl` radius rung is retired with the others. Nothing in the tree picked it once the corner chrome folded onto `lg`, and the source lint already refused it; the token itself is now gone too, so the ladder is four rungs: sm, md, lg, xl. A deployment component that still says `rounded-2xl` loses its corner radius and should say `rounded-xl`.
