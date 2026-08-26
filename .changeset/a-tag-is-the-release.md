---
"agentic-service-blueprinting": patch
---

The two contracts this repo ships are named in an ADR, and the tag that makes
one of them pinnable is now checkable. ADR 1 records the split — a plugin
contract consumers resolve by name at runtime, and a template surface they fork
— the frozen identifier layer inside it, that semver covers the plugin contract
only, and why `private: true` stays with no `files` allowlist. Every release
gets an annotated `v<version>` tag on `main`, which is the only thing a
consumer can pin, and `npm run check:release-tag` refuses a tag that names an
unreleased version, a tag pointing at a tree that states a different one, and
— once tagging has started — a release that skipped it.
