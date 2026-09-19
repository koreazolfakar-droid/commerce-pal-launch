import re
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: ci-match-tsc.py <path> <min-line> <max-line>")

target = sys.argv[1]
lo = int(sys.argv[2])
hi = int(sys.argv[3])
log = Path("tsc.log").read_text(encoding="utf-8", errors="replace").splitlines()
pattern = re.compile(r"^(.*)\((\d+),(\d+)\): error TS\d+:")

for line in log:
    match = pattern.match(line)
    if not match:
        continue
    path, line_no, _ = match.groups()
    normalized = path.replace("\\", "/")
    if normalized.endswith(target) and lo <= int(line_no) <= hi:
        raise SystemExit(1)

raise SystemExit(0)
