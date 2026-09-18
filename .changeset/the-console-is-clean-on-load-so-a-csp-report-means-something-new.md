---
'agentic-service-blueprinting': patch
---

The console is clean on load, so a Content Security Policy report now means
something new.

Every build until now logged one CSP refusal on every load, and it was never
yours to fix. zod builds a faster parser for object schemas by generating
source and handing it to the `Function` constructor, and it finds out whether
that is allowed the only way a feature detection can — by attempting it. The
`default-src 'self'` in `public/_headers` refuses the attempt, zod catches the
throw and falls back to its runtime parser exactly as designed, and the
browser reports the refusal anyway: a caught `eval` error still fires a
`securitypolicyviolation` and still logs. The guidance was to expect exactly
one and read past it.

`src/lib/validationJit.ts` sets zod's own `jitless` flag at the app root, which
costs nothing under this policy — the probe was always going to fail and the
runtime parser was always going to run, so nothing about validation changes.
zod simply stops asking a question the policy had already answered. Verified on
a built distribution served with the real header and driven in Chromium: one
`securitypolicyviolation` before, zero after.

**The script policy did not move, and will not.** `'unsafe-eval'` would have
bought the same silence with the protection the policy exists for, and
suppressing the report would have hidden a signal worth keeping.
`docs/adr/0029-the-script-policy-stays-strict-and-jitless-makes-it-free.md`
holds that argument for whoever next proposes loosening `script-src`.

### Upgrading a deployment

- **Nothing to configure.** Take the release; the flag is set by the package.
- **Re-read your baseline.** A CSP refusal in the console used to include one
  that meant nothing. It no longer does, so treat any report as a new fact
  worth chasing.
- **Two placeholder errors are not refusals.** If your `public/_headers` still
  names `YOUR_PROJECT_REF.supabase.co`, the browser logs two "invalid source"
  errors about it and every database call is blocked. Substitute your project
  ref — that file's header says so, and it is the only console noise left on a
  fresh load.
