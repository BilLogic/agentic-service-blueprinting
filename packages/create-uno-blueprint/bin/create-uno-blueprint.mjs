#!/usr/bin/env node
/**
 * The command. Everything it does is `run`; this file only hands it the real
 * process, so a test can hand it a throwaway one.
 *
 * No top-level `await`: an old Node has to get as far as `run` to be told
 * which Node is needed, and one that cannot parse this file says something
 * else instead.
 */
import { run } from '../src/run.mjs'

run({
  argv: process.argv.slice(2),
  env: process.env,
  cwd: process.cwd(),
  stdout: process.stdout,
  stderr: process.stderr,
  nodeVersion: process.versions.node,
}).then((code) => {
  process.exitCode = code
})
