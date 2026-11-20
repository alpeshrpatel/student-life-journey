#!/usr/bin/env python3
"""Execution tracker helper for docs/plan/00_PROGRESS_LOG.md, section 5.

Standard library only. It reads and edits the tracker table so that an executor
agent never has to hand-edit a 250-row table or compute which story is next.

Usage (run from the repository root):
  python3 docs/plan/tools/tracker.py summary
  python3 docs/plan/tools/tracker.py next [--maxtier 2] [--release R1] [--only S-R1-018]
  python3 docs/plan/tools/tracker.py set S-R0-001 "IN PROGRESS"
  python3 docs/plan/tools/tracker.py set S-R0-001 DONE --commit abc1234567
  python3 docs/plan/tools/tracker.py pending-pr
  python3 docs/plan/tools/tracker.py pr https://github.com/OWNER/REPO/pull/12
  python3 docs/plan/tools/tracker.py sync
  python3 docs/plan/tools/tracker.py check
  python3 docs/plan/tools/tracker.py init            (only when section 5 does not exist yet)

Add --file PATH to work on a copy (used by the tests of this script).
"""
import argparse
import os
import re
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
DEFAULT_LOG = os.path.join(ROOT, "docs", "plan", "00_PROGRESS_LOG.md")
STORIES_DIR = os.path.join(ROOT, "docs", "plan", "stories")

HEADER = "## 5. Execution tracker"
STATUSES = ["TODO", "IN PROGRESS", "DONE", "DONE*", "WAITING HUMAN", "BLOCKED"]
SATISFIED = {"DONE", "DONE*"}
ID_RE = r"S-R\d-\d{3}"
ROW_RE = re.compile(
    r"^\| (" + ID_RE + r") \| (.*?) \| (1|2|3|HUMAN) \| (XS|S|M|L) \| (.*?) \| "
    r"(TODO|IN PROGRESS|DONE\*?|WAITING HUMAN|BLOCKED) \| (.*?) \| (.*?) \|\s*$"
)
EMPTY = "—"

LEGEND = """\
Written and updated by the executor agent through `docs/plan/tools/tracker.py` (see `docs/plan/EXECUTOR_PROMPT.md`).
Do not edit by hand unless you are the founder marking a human chore.

| Status | Meaning |
|---|---|
| `TODO` | Not started |
| `IN PROGRESS` | An executor is working on it (or died while doing so: resume it) |
| `DONE` | Every acceptance criterion was demonstrated and the story's commit exists |
| `DONE*` | Done locally; at least one acceptance criterion needs a human, an account or a deployment (see `docs/plan/EXECUTION_LOG.md`). Counts as satisfied for dependants |
| `WAITING HUMAN` | A person must act (HUMAN-tier story, or a human step named by the log). Founder sets `DONE` when finished |
| `BLOCKED` | Stopped on a stop condition or a failure the executor could not resolve; reason in the log |

Columns: story · title · executor tier (`1`, `2`, `3`, `HUMAN`) · size · dependencies · status · commit (short hash of the story's code commit) · PR (link of the pull request that carries it).
"""


def die(msg, code=2):
    print("ERROR: " + msg, file=sys.stderr)
    sys.exit(code)


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def write_atomic(path, text):
    d = os.path.dirname(path)
    fd, tmp = tempfile.mkstemp(prefix=".tracker-", dir=d)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write(text)
    os.replace(tmp, path)


def release_of(story_id):
    return "R" + story_id.split("-")[1][1]


def story_file(story_id):
    rel = release_of(story_id)
    d = os.path.join(STORIES_DIR, rel)
    if not os.path.isdir(d):
        return None
    for name in sorted(os.listdir(d)):
        if name.startswith(story_id + "-") and name.endswith(".md"):
            return os.path.join(d, name)
    return None


def rel_path(p):
    return os.path.relpath(p, ROOT)


def parse_story(path, story_id):
    """Return dict(title, tier, size, deps) from a story file."""
    text = read(path)
    m = re.search(r"^# " + re.escape(story_id) + r" — (.+)$", text, re.M)
    title = m.group(1).strip() if m else "?"
    size = re.search(r"^\| Size \| (XS|S|M|L)\b", text, re.M)
    tier = re.search(r"^\| Executor tier \| (Tier-([123])|HUMAN)", text, re.M)
    deps_line = re.search(r"^\| Depends on \| (.*) \|\s*$", text, re.M)
    deps = []
    if deps_line:
        for tok in re.findall(ID_RE + r"|\b\d{3}\b", deps_line.group(1)):
            deps.append(tok if tok.startswith("S-") else "S-%s-%s" % (story_id.split("-")[1], tok))
    return {
        "title": title,
        "size": size.group(1) if size else "S",
        "tier": ("HUMAN" if tier and tier.group(1) == "HUMAN" else (tier.group(2) if tier else "2")),
        "deps": deps,
    }


def parse_manifest(log_text):
    """Rows of the section 4 manifest: id, title, size, tier, deps."""
    rows = []
    for line in log_text.splitlines():
        m = re.match(r"^\| (" + ID_RE + r") \| (.*?) \| (.*?) \| (.*?) \| (XS|S|M|L) \| (1|2|3|HUMAN) \| (.*?) \|\s*$", line)
        if not m:
            continue
        sid = m.group(1)
        deps = []
        for tok in re.findall(ID_RE + r"|\b\d{3}\b", m.group(7)):
            deps.append(tok if tok.startswith("S-") else "S-%s-%s" % (sid.split("-")[1], tok))
        rows.append({"id": sid, "title": m.group(2), "size": m.group(5), "tier": m.group(6), "deps": deps})
    return rows


def row_text(r):
    deps = ", ".join(r["deps"]) if r["deps"] else EMPTY
    return "| %s | %s | %s | %s | %s | %s | %s | %s |" % (
        r["id"], r["title"].replace("|", "/"), r["tier"], r["size"], deps, r["status"], r["commit"], r["pr"])


def load(path):
    text = read(path)
    lines = text.split("\n")
    rows = []
    for i, line in enumerate(lines):
        m = ROW_RE.match(line)
        if not m:
            continue
        # only rows after the section 5 header
        rows.append({
            "line": i, "id": m.group(1), "title": m.group(2), "tier": m.group(3), "size": m.group(4),
            "deps": [] if m.group(5).strip() in (EMPTY, "", "-") else [d.strip() for d in m.group(5).split(",")],
            "status": m.group(6), "commit": m.group(7), "pr": m.group(8),
        })
    start = next((i for i, l in enumerate(lines) if l.startswith(HEADER)), None)
    if start is None:
        return lines, [], None
    rows = [r for r in rows if r["line"] > start]
    return lines, rows, start


def save(path, lines, rows):
    for r in rows:
        lines[r["line"]] = row_text(r)
    write_atomic(path, "\n".join(lines))


def by_id(rows):
    return {r["id"]: r for r in rows}


# ---------------------------------------------------------------- commands

def cmd_init(a):
    text = read(a.file)
    if HEADER in text:
        die("section 5 already exists; use `sync` to refresh it")
    manifest = parse_manifest(text)
    if len(manifest) < 200:
        die("manifest looks incomplete (%d rows found)" % len(manifest))
    out = []
    for m in manifest:
        p = story_file(m["id"])
        if p:
            d = parse_story(p, m["id"])
            title, tier, size, deps = d["title"], d["tier"], d["size"], d["deps"]
        else:
            title, tier, size, deps = m["title"], m["tier"], m["size"], m["deps"]
        out.append(row_text({"id": m["id"], "title": title, "tier": tier, "size": size, "deps": deps,
                             "status": "TODO", "commit": EMPTY, "pr": EMPTY}))
    section = ["", "---", "", HEADER, "", LEGEND, "",
               "| ID | Title | Tier | Size | Depends on | Status | Commit | PR |",
               "|---|---|---|---|---|---|---|---|"] + out + [""]
    write_atomic(a.file, text.rstrip("\n") + "\n" + "\n".join(section))
    print("tracker written: %d rows" % len(out))


def cmd_sync(a):
    lines, rows, start = load(a.file)
    if start is None:
        die("section 5 not found; run `init`")
    changed = 0
    for r in rows:
        p = story_file(r["id"])
        if not p:
            continue
        d = parse_story(p, r["id"])
        new = (d["title"], d["tier"], d["size"], d["deps"])
        old = (r["title"], r["tier"], r["size"], r["deps"])
        if new != old:
            r["title"], r["tier"], r["size"], r["deps"] = new
            changed += 1
    save(a.file, lines, rows)
    print("synced from story files: %d rows updated (status, commit and PR untouched)" % changed)


def cmd_check(a):
    lines, rows, start = load(a.file)
    if start is None:
        die("section 5 not found")
    ids = by_id(rows)
    problems = []
    if len(ids) != len(rows):
        problems.append("duplicate IDs in the tracker")
    for r in rows:
        for d in r["deps"]:
            if d not in ids:
                problems.append("%s depends on unknown %s" % (r["id"], d))
        if r["id"] in r["deps"]:
            problems.append("%s depends on itself" % r["id"])
    # cycle check (Kahn)
    indeg = {i: 0 for i in ids}
    for r in rows:
        for d in r["deps"]:
            if d in ids:
                indeg[r["id"]] += 1
    queue = [i for i, n in indeg.items() if n == 0]
    seen = 0
    kids = {i: [] for i in ids}
    for r in rows:
        for d in r["deps"]:
            if d in ids:
                kids[d].append(r["id"])
    while queue:
        x = queue.pop()
        seen += 1
        for k in kids[x]:
            indeg[k] -= 1
            if indeg[k] == 0:
                queue.append(k)
    if seen != len(ids):
        problems.append("dependency cycle among %d stories" % (len(ids) - seen))
    missing = [r["id"] for r in rows if not story_file(r["id"])]
    for r in rows:
        if r["status"] in SATISFIED and r["tier"] != "HUMAN" and r["commit"] == EMPTY:
            problems.append("%s is %s without a commit hash" % (r["id"], r["status"]))
    print("rows: %d, story files missing: %d" % (len(rows), len(missing)))
    if missing:
        print("missing files: " + ", ".join(missing))
    if problems:
        for p in problems:
            print("PROBLEM: " + p)
        sys.exit(1)
    print("tracker OK")


def cmd_summary(a):
    lines, rows, start = load(a.file)
    if start is None:
        die("section 5 not found")
    print("TOTAL %d" % len(rows))
    for rel in ["R0", "R1", "R2", "R3", "R4"]:
        rr = [r for r in rows if release_of(r["id"]) == rel]
        parts = ["%s=%d" % (s, len([r for r in rr if r["status"] == s])) for s in STATUSES]
        print("%s (%d): %s" % (rel, len(rr), "  ".join(parts)))
    print("ALL: " + "  ".join("%s=%d" % (s, len([r for r in rows if r["status"] == s])) for s in STATUSES))
    rem = [r for r in rows if r["status"] in ("TODO", "IN PROGRESS")]
    print("REMAINING BY TIER: " + "  ".join("%s=%d" % (t, len([r for r in rem if r["tier"] == t])) for t in ["1", "2", "3", "HUMAN"]))
    ip = [r["id"] for r in rows if r["status"] == "IN PROGRESS"]
    if ip:
        print("IN PROGRESS: " + ", ".join(ip))
    wh = [r["id"] for r in rows if r["status"] == "WAITING HUMAN"]
    if wh:
        print("WAITING HUMAN: " + ", ".join(wh))
    bl = [r["id"] for r in rows if r["status"] == "BLOCKED"]
    if bl:
        print("BLOCKED: " + ", ".join(bl))


def cmd_next(a):
    lines, rows, start = load(a.file)
    if start is None:
        die("section 5 not found")
    ids = by_id(rows)
    maxtier = int(a.maxtier)
    human_ready, tier_skipped, dep_wait, missing = [], 0, 0, []
    in_progress = [r for r in rows if r["status"] == "IN PROGRESS"]
    chosen = None
    candidates = in_progress + [r for r in rows if r["status"] == "TODO"]
    if a.only:
        if a.only not in ids:
            die("unknown story " + a.only)
        t = ids[a.only]
        why = None
        if t["status"] not in ("TODO", "IN PROGRESS"):
            why = "status is %s" % t["status"]
        elif t["tier"] == "HUMAN":
            why = "it is a HUMAN story"
        elif int(t["tier"]) > maxtier:
            why = "tier %s is above maxtier %d" % (t["tier"], maxtier)
        else:
            open_deps = [d for d in t["deps"] if ids[d]["status"] not in SATISFIED]
            if open_deps:
                why = "waiting on " + ", ".join("%s (%s)" % (d, ids[d]["status"]) for d in open_deps)
        if why:
            print("NOT-ELIGIBLE %s: %s" % (a.only, why))
            sys.exit(1)
        candidates = [t]
    for r in candidates:
        if a.release and release_of(r["id"]) != a.release:
            continue
        ok = all(ids[d]["status"] in SATISFIED for d in r["deps"] if d in ids)
        unknown = [d for d in r["deps"] if d not in ids]
        if unknown:
            die("%s depends on unknown story %s" % (r["id"], ", ".join(unknown)))
        if r["tier"] == "HUMAN":
            if ok and r["status"] == "TODO":
                human_ready.append(r["id"])
            continue
        if not ok:
            dep_wait += 1
            continue
        if int(r["tier"]) > maxtier:
            tier_skipped += 1
            continue
        if chosen is None:
            chosen = r
    if human_ready:
        print("HUMAN-READY " + ", ".join(human_ready))
    print("SKIPPED-TIER-ABOVE-MAX %d" % tier_skipped)
    print("WAITING-ON-DEPENDENCIES %d" % dep_wait)
    if chosen is None:
        print("NONE")
        sys.exit(1)
    p = story_file(chosen["id"])
    if not p:
        print("MISSING-FILE " + chosen["id"])
        sys.exit(3)
    print("NEXT " + chosen["id"])
    print("TITLE " + chosen["title"])
    print("TIER %s" % chosen["tier"])
    print("SIZE " + chosen["size"])
    print("RESUME %s" % ("yes" if chosen["status"] == "IN PROGRESS" else "no"))
    print("FILE " + rel_path(p))


def cmd_set(a):
    lines, rows, start = load(a.file)
    if start is None:
        die("section 5 not found")
    ids = by_id(rows)
    if a.id not in ids:
        die("unknown story " + a.id)
    if a.status not in STATUSES:
        die("status must be one of: " + ", ".join(STATUSES))
    r = ids[a.id]
    if a.status in SATISFIED:
        if r["tier"] == "HUMAN":
            r["commit"] = EMPTY
            r["pr"] = "human"
        else:
            if not a.commit and r["commit"] == EMPTY:
                die("DONE needs --commit <short hash> for a non-human story")
            if a.commit:
                if not re.fullmatch(r"[0-9a-f]{7,40}", a.commit):
                    die("--commit must be a hex hash")
                r["commit"] = a.commit
    if a.commit and a.status not in SATISFIED:
        die("--commit is only for DONE and DONE*")
    r["status"] = a.status
    save(a.file, lines, rows)
    print("%s -> %s%s" % (r["id"], r["status"], (" (" + r["commit"] + ")") if r["commit"] != EMPTY else ""))


def pending(rows):
    return [r for r in rows if r["status"] in SATISFIED and r["tier"] != "HUMAN" and r["pr"] == EMPTY]


def cmd_pending(a):
    lines, rows, start = load(a.file)
    if start is None:
        die("section 5 not found")
    p = pending(rows)
    rels = sorted({release_of(r["id"]) for r in p})
    print("PENDING-PR %d" % len(p))
    print("RELEASES " + (",".join(rels) if rels else EMPTY))
    for r in p:
        print("%s %s %s %s" % (r["id"], r["status"], r["commit"], r["title"]))


def cmd_pr(a):
    if not re.fullmatch(r"https://github\.com/[^/]+/[^/]+/pull/\d+", a.url):
        die("PR link must look like https://github.com/OWNER/REPO/pull/N")
    lines, rows, start = load(a.file)
    if start is None:
        die("section 5 not found")
    p = pending(rows)
    if not p:
        die("no finished stories are waiting for a PR", 1)
    for r in p:
        r["pr"] = a.url
    save(a.file, lines, rows)
    print("PR %s recorded for %d stories: %s" % (a.url, len(p), ", ".join(r["id"] for r in p)))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--file", default=DEFAULT_LOG)
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("init").set_defaults(fn=cmd_init)
    sub.add_parser("sync").set_defaults(fn=cmd_sync)
    sub.add_parser("check").set_defaults(fn=cmd_check)
    sub.add_parser("summary").set_defaults(fn=cmd_summary)
    n = sub.add_parser("next")
    n.add_argument("--maxtier", default="2", choices=["1", "2", "3"])
    n.add_argument("--release", choices=["R0", "R1", "R2", "R3", "R4"])
    n.add_argument("--only", help="check and select exactly this story id")
    n.set_defaults(fn=cmd_next)
    s = sub.add_parser("set")
    s.add_argument("id")
    s.add_argument("status")
    s.add_argument("--commit")
    s.set_defaults(fn=cmd_set)
    sub.add_parser("pending-pr").set_defaults(fn=cmd_pending)
    p = sub.add_parser("pr")
    p.add_argument("url")
    p.set_defaults(fn=cmd_pr)
    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
