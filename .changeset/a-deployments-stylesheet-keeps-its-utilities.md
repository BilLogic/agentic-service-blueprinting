---
'agentic-service-blueprinting': patch
---

A deployment's stylesheet keeps its utility classes. If you read the application out of this package rather than keeping a copy of it in your own `src`, the stylesheet you built had **no utility classes in it at all** — measured on a staged deployment, 83 kB against 291 kB, and nine class names with a rule rather than sixteen hundred, every one of those nine hand-written in this package's own CSS. The build succeeded, the CSS file was written, and every element on the page rendered unstyled.

**Why it happened.** Tailwind writes a rule for a class name only where it finds that name written down, and the scan it does by itself starts at your project root and refuses `node_modules`. A repository that keeps the application in `src` is covered by that scan by coincidence: the root it starts at is the root the markup lives in. Once the application arrives as a package, every class name the markup uses sits in the one directory the scan will not read — and "found no class names" is not an error, so nothing reported it.

**What changed.** The stylesheet entry now names the application's source root itself, from inside itself, so the application is scanned wherever it is read from. The path is relative to the entry, which travels with the markup it describes, so it holds whether this package is linked into your tree, hoisted to the top of your `node_modules`, or nested under another dependency — all three measured, all three building the identical stylesheet.

**What you do:** nothing, and take the release. You import `agentic-service-blueprinting/styles.css` exactly as before; your own markup in `deployment/` is still found by the ordinary scan of your project root, and your stylesheet gains the application's utilities alongside it. If you had worked around this with an `@source` of your own pointed into `node_modules`, you can drop it — it is now the package's business and no longer yours to maintain against a path inside someone else's package.

**A repository that keeps the application in `src` builds the same stylesheet as before**, byte for byte. That is measured, not reasoned: the suite builds the stylesheet from each root and compares the class names that have a rule, so a release that loses a deployment's utilities fails here rather than on a page someone opens.
