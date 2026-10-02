#!/usr/bin/env node
/**
 * The command. Everything it does is `run`; this file hands it the real
 * process, so a test can hand it a throwaway one.
 *
 * WRITTEN IN THE SYNTAX AN OLD NODE PARSES, and that is the whole reason it
 * looks the way it does. `run` checks the Node floor first — but a Node old
 * enough fails to PARSE the module `run` lives in, and says `SyntaxError`
 * about an operator instead of which Node is needed. So the floor is checked
 * here as well, in nothing newer than `var` and a function expression, and
 * the entry is imported only once it has passed. The floor is the one in
 * `src/run.mjs` and the root manifest's `engines`.
 */
var NODE_FLOOR = 22

function lastResort(error) {
  // Nothing should arrive here: `run` reports its own failures in one line.
  // What does is still owed one line and a failing exit, not a stack trace.
  var why = error && error.message ? error.message : String(error)
  process.stderr.write('create-uno-blueprint: ' + why.replace(/\s+/g, ' ') + '\n')
  process.exitCode = 1
}

// "Not at least", so a version that cannot be read is refused too.
if (!(parseInt(process.versions.node, 10) >= NODE_FLOOR)) {
  process.stderr.write(
    'create-uno-blueprint: Node ' + NODE_FLOOR + ' or later is needed; this is Node ' + process.versions.node + '.\n'
  )
  process.exitCode = 1
} else {
  import('../src/run.mjs')
    .then(function (entry) {
      return entry.run({
        argv: process.argv.slice(2),
        env: process.env,
        cwd: process.cwd(),
        stdout: process.stdout,
        stderr: process.stderr,
        nodeVersion: process.versions.node,
      })
    })
    .then(function (code) {
      process.exitCode = code
    })
    .catch(lastResort)
}
