---
'uno-blueprint': minor
---

The template follows the system theme

With nothing stored, the app now opens in whatever light or dark mode the
reader's operating system is set to, and keeps following it when the OS
flips — before, it opened light regardless. A dark OS also gets a dark canvas
before the app has loaded, rather than a white flash.

The theme toggle stays two-state. Toggling away from what the OS prefers
stores that choice, which then holds; toggling back onto it returns to
following the OS. A reader who already chose keeps their choice until they
next toggle onto their OS's setting.
