#!/usr/bin/env python3
import subprocess
import sys

script = "/private/tmp/claude-501/-Users-billguo-Desktop-uno-blueprint/b7f00cb3-1de6-407b-8b04-015e6dde730b/scratchpad/skill-eval/audit-sandbox/build_report.py"
result = subprocess.run([sys.executable, script], capture_output=True, text=True)
print(result.stdout, end="")
print(result.stderr, end="", file=sys.stderr)
sys.exit(result.returncode)
