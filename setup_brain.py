#!/usr/bin/env python3
"""
setup_brain.py — One-command project brain setup
=================================================
Drop this file into your project root and run it once.

USAGE
-----
  python setup_brain.py                     # creates templates in current directory
  python setup_brain.py /path/to/project    # for a specific project path
  python setup_brain.py --generate          # fills templates from your code using
                                            # Claude API (needs ANTHROPIC_API_KEY)

WHAT IT CREATES
---------------
  AGENTS.md                  root context file (auto-loaded by Antigravity & Claude Code)
  .brain/
    index.md                 project overview + module list
    architecture.md          system design & key tech decisions
    connections.md           module dependency map
    decisions/
      README.md              how to write decision records
  <each detected module>/
    AGENTS.md                per-module context file

AFTER RUNNING
-------------
  1. Fill in every [TODO] section — especially 'Key flows' and
     'What this module does NOT do (and why)'.
  2. Fill in .brain/connections.md with your module dependency arrows.
  3. Team rule: update the relevant AGENTS.md in every PR that
     significantly changes a module's behavior or design.
"""

import os
import sys
import datetime

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

TODAY = datetime.date.today().isoformat()

# Common source root directory names to check first
SOURCE_ROOT_CANDIDATES = [
    "src", "lib", "app", "modules", "services",
    "packages", "internal", "core", "api", "backend"
]

# Directories to ignore when scanning for modules
SKIP_DIRS = {
    "node_modules", ".git", "__pycache__", "dist", "build", ".next",
    "vendor", "venv", ".venv", ".brain", "coverage", "test", "tests",
    "__tests__", "e2e", "fixtures", "migrations", "assets", "public",
    "static", ".turbo", ".cache", "out", ".svelte-kit", ".nuxt",
}

# A directory counts as a "module" only if it contains at least one of these
CODE_EXTENSIONS = {
    ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".cs", ".java",
    ".kt", ".rs", ".rb", ".php", ".swift", ".cpp", ".c", ".ex", ".exs",
}


# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------

def tpl_module_agents(module_name: str) -> str:
    return f"""\
# {module_name} Module

> **Created by setup_brain.py — {TODAY}**
>
> Fill in every section marked [TODO].
> Be specific: use real class names, method names, event names, Redis keys —
> whatever is actually in your code. Vague descriptions help nobody.
> Keep this file under ~2 000 words so it stays inside the AI context window.

---

## What this module does

[TODO: 2–3 sentences. What does this module own and is responsible for?

Bad  → "Handles authentication."
Good → "Issues and validates JWT access tokens (15-min) and refresh tokens
         (30-day, stored in Redis). Handles login, logout, and token rotation.
         Does NOT authorise what a user can access — that is the Permissions module."]

---

## Key flows

[TODO: Step-by-step flows for the 2–4 most important processes.
Use real method names where possible. Include error paths.

**Flow name:**
1. Step one — what happens, which function is called
2. Step two — what is checked / computed
3. Step three → stores X in Redis / emits SomeEvent / returns Y
On error: what happens if step 2 fails?
]

---

## Architectural decisions

[TODO: Key design choices in this module and the reason behind each.
Focus on things that are NOT obvious from reading the code.

Examples:
- "We store refresh tokens as hashed values in Redis (not the DB) because
   Redis TTL handles expiry automatically and avoids a DB write on every refresh."
- "We use optimistic locking here because writes are rare and contention is low."
- "We chose not to use a blacklist for access tokens — see decisions/002."]

---

## How this module connects to others

[TODO: What does this module call, import from, or emit to?
One entry per dependency. Be specific about what and why.

Format:
  **ModuleName:** what we call / use / receive from it.

Leave this section blank ONLY if this module has zero external dependencies.]

---

## What this module does NOT do (and why)

[TODO: Explicitly list things that are out of scope.
For EACH item, add a one-sentence WHY so the AI can suggest an alternative
rather than just hitting a wall.

Example:
- **Does not send emails directly** — we emit events for loose coupling. If
  you need to trigger an email, add the data to the relevant event payload and
  let the Notifications module handle delivery.
- **Does not rate-limit requests** — that lives at the API gateway level so it
  applies uniformly before any module code runs.]

---

## Gotchas and things to know

[TODO: Non-obvious things that would trip up a new contributor.
Sources: TODO/HACK/FIXME comments, things that broke in production,
edge cases in error handling, known technical debt, timing dependencies.

One bullet per gotcha. Be blunt.]

---

## Last updated

{TODAY} | Created by setup_brain.py — needs human review
"""


def tpl_root_agents(modules: list) -> str:
    lines = "\n".join(f"- `{m}/AGENTS.md`" for m in modules) or "- (none detected yet)"
    return f"""\
# Project Brain

> This file is auto-loaded by Antigravity, Claude Code, and Codex
> when you work in this project. Keep it short — it just explains
> the system and points to the real context files.

---

## How the brain system works

This project uses per-module `AGENTS.md` files + a `.brain/` folder.
When you open a file in a module, your AI loads that module's `AGENTS.md`
automatically — it already knows the flows, decisions, and constraints
without you having to re-explain them every session.

| What you need | Where it is |
|---|---|
| Project overview | `.brain/index.md` |
| System architecture & tech choices | `.brain/architecture.md` |
| Module-to-module dependency map | `.brain/connections.md` |
| Why major decisions were made | `.brain/decisions/` |
| What a specific module does | `<module>/AGENTS.md` |

## Module context files

{lines}

## Team rule

If your PR changes something significant in a module — a new flow, a changed
architectural decision, a new dependency on another module — update that
module's `AGENTS.md` in the same PR. The reviewer checks it alongside the code.

---
Created by setup_brain.py on {TODAY}
"""


def tpl_brain_index(modules: list) -> str:
    rows = "\n".join(f"| `{m}` | [TODO: one-line description] |" for m in modules)
    if not rows:
        rows = "| (none detected) | — |"
    return f"""\
# Project Index

> Fill in every [TODO]. This file is read when the AI needs an overview of
> the whole project rather than a single module.

---

## Project overview

[TODO: 2–3 sentences. What does this project do? Who uses it?]

---

## Tech stack

| Layer | Technology |
|---|---|
| Language | [TODO] |
| Framework | [TODO] |
| Primary database | [TODO] |
| Cache | [TODO] |
| Queue / event bus | [TODO] |
| Auth approach | [TODO] |
| Hosting / infra | [TODO] |
| CI/CD | [TODO] |

---

## Modules

| Module | What it does |
|---|---|
{rows}

---

## External services

[TODO: External APIs, SaaS tools, or third-party services this project
integrates with. Format: ServiceName → what we use it for.]

---

## Team

[TODO: Who owns which module? Who to ask about what?]

---
Created by setup_brain.py on {TODAY}
"""


def tpl_brain_architecture() -> str:
    return f"""\
# Architecture

> The most important cross-cutting context file.
> Fill it in once, update it when major decisions change.

---

## System design overview

[TODO: What is the overall shape of the system?
Monolith or microservices? Event-driven or request/response?
REST, GraphQL, or gRPC? Mobile app + API? Multi-tenant SaaS?
Describe in 3–5 sentences.]

---

## Key technology choices and why

[TODO: Why did you choose your main framework, database, and infrastructure?
Focus on non-obvious choices — the things you'd have to explain to a
new team member who asks "why not just use X?"]

---

## Communication patterns between modules

[TODO: How do modules talk to each other?
- Direct imports within a monolith?
- REST calls between services?
- Event bus / message queue (which one, what format)?
- Mix of the above?
Note the main pattern AND any intentional exceptions.]

---

## Data storage strategy

[TODO: What data goes where and why?
Example:
  PostgreSQL  → user profiles, orders (relational, ACID required)
  Redis       → sessions, rate-limit counters, job queue (ephemeral, fast)
  S3          → file uploads (object storage)
  Elasticsearch → full-text search index]

---

## Deployment and infrastructure

[TODO: Where does this run? How does code get from PR → production?
Docker Compose? Kubernetes? Serverless? Vercel/Render/Railway?
What does the CI pipeline do?]

---

## Patterns we deliberately do NOT use

[TODO: Technologies or patterns we considered and explicitly rejected.
This prevents the same debates recurring and helps AI avoid suggesting
things you've already decided against.

Format: "No X — reason why." One line each.]

---
Created by setup_brain.py on {TODAY}
"""


def tpl_brain_connections(modules: list) -> str:
    stubs = "\n".join(f"  `{m}` → [TODO: what it depends on]" for m in modules)
    if not stubs:
        stubs = "  (add entries as you discover dependencies)"
    return f"""\
# Module Dependency Map

> Update this file whenever you add or change a connection between modules.
> Read this first whenever you're doing cross-module work.

---

## Dependencies

[TODO: One line per dependency. Format:
  `ModuleA` → `ModuleB`  (what A uses B for)

Example:
  `auth`          → `redis`          (refresh tokens, key: rt:{{user_id}}:{{device_id}})
  `auth`          → `notifications`  (emits user.registered on signup)
  `pricing`       → `auth`           (reads roles[] from JWT claims)
  `pricing`       → `redis`          (rate-limit counters, plan cache)
  `notifications` → `redis`          (job queue for async delivery)
]

Modules detected in this project:
{stubs}

---

## Shared / core modules

[TODO: Which modules are imported by many others?
List them here — they need extra care when changing.]

---

## External connections

[TODO: Which modules connect to external services?
  `module` → `ServiceName`  (what we use it for)]

---
Created by setup_brain.py on {TODAY}
"""


def tpl_decisions_readme() -> str:
    return f"""\
# Decision Records

Each file here documents one significant architectural decision.
Add a file whenever you make a choice you might revisit, or decide NOT to do something.

---

## When to add a record

- Choosing between two approaches (and wanting to remember why you picked one)
- Explicitly deciding NOT to use a technology or pattern
- Reversing an earlier decision

---

## Naming convention

`NNN-short-description.md`  e.g. `001-jwt-vs-sessions.md`
Pad numbers to three digits so files sort correctly.

---

## Template (copy into a new file)

```
# NNN — Title

Date: YYYY-MM-DD
Status: Decided   (or: Superseded by decisions/NNN-new-title.md)

## Context
What situation led to this decision? What problem were we solving?

## Decision
What exactly did we decide to do?

## Why
The reasoning. What made this the right choice for our context?

## Alternatives we considered
What else did we look at, and why did we reject it?

## Consequences
What does this enable? What does it constrain or make harder?
```

---
Created by setup_brain.py on {TODAY}
"""


# ---------------------------------------------------------------------------
# Optional: Claude API fill mode
# ---------------------------------------------------------------------------

def fill_with_claude(module_path: str, module_name: str, template: str) -> str:
    """
    Use the Claude API to generate AGENTS.md content from the module's code.
    Returns the filled template, or the empty template if generation fails.
    """
    try:
        import anthropic
    except ImportError:
        print("    [!] 'anthropic' package not installed. Run: pip install anthropic")
        return template

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("    [!] ANTHROPIC_API_KEY not set. Falling back to empty template.")
        return template

    # Collect source files (cap at 50 000 chars total)
    code_parts = []
    total_chars = 0
    for root, dirs, files in os.walk(module_path):
        dirs[:] = sorted(d for d in dirs if d not in SKIP_DIRS)
        for fname in sorted(files):
            if os.path.splitext(fname)[1] not in CODE_EXTENSIONS:
                continue
            fpath = os.path.join(root, fname)
            rel = os.path.relpath(fpath, module_path)
            try:
                content = open(fpath, encoding="utf-8", errors="ignore").read()
                chunk = f"\n### {rel}\n```\n{content[:5_000]}\n```"
                if total_chars + len(chunk) > 50_000:
                    code_parts.append("\n### [...remaining files truncated...]")
                    break
                code_parts.append(chunk)
                total_chars += len(chunk)
            except Exception:
                pass

    if not code_parts:
        print(f"    [!] No source files found in {module_path}. Using empty template.")
        return template

    prompt = f"""Analyse the source code files below and fill in the AGENTS.md
template for the "{module_name}" module.

Rules:
- Be SPECIFIC. Use real class names, method names, event names, key patterns
  from the actual code — not generic descriptions.
- Where you are uncertain, write [?] and give your best guess.
- Do not remove any section header or the "Last updated" line.
- Keep total output under 2 000 words.
- Output only the filled markdown, nothing else.

TEMPLATE:
{template}

SOURCE CODE:
{"".join(code_parts)}
"""

    client = anthropic.Anthropic(api_key=api_key)
    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2_000,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text.strip()
    except Exception as e:
        print(f"    [!] API call failed: {e}. Using empty template.")
        return template


# ---------------------------------------------------------------------------
# File / directory helpers
# ---------------------------------------------------------------------------

def has_code(directory: str) -> bool:
    """True if the directory contains at least one recognised source file."""
    for _, _, files in os.walk(directory):
        return any(os.path.splitext(f)[1] in CODE_EXTENSIONS for f in files)
    return False


def find_modules(project_root: str):
    """
    Returns (list of (name, abs_path), source_root_label).
    Checks SOURCE_ROOT_CANDIDATES first, falls back to project root itself.
    """
    for candidate in SOURCE_ROOT_CANDIDATES:
        src = os.path.join(project_root, candidate)
        if not os.path.isdir(src):
            continue
        modules = [
            (e.name, e.path)
            for e in sorted(os.scandir(src), key=lambda e: e.name)
            if e.is_dir() and e.name not in SKIP_DIRS and has_code(e.path)
        ]
        if modules:
            return modules, candidate

    # Fallback: top-level directories
    modules = [
        (e.name, e.path)
        for e in sorted(os.scandir(project_root), key=lambda e: e.name)
        if e.is_dir() and e.name not in SKIP_DIRS and has_code(e.path)
    ]
    return modules, None


def write(path: str, content: str, overwrite: bool = False) -> bool:
    """Write content to path. Skips if file exists and overwrite is False."""
    if os.path.exists(path) and not overwrite:
        print(f"  skip  {os.path.relpath(path)}  (exists — not overwritten)")
        return False
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  write {os.path.relpath(path)}")
    return True


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run(project_root: str, generate: bool = False) -> None:
    project_root = os.path.abspath(project_root)
    print(f"\nProject brain setup")
    print(f"Root: {project_root}")
    print("─" * 60)

    # Detect modules -----------------------------------------------------------
    modules, src_label = find_modules(project_root)
    module_names = [m[0] for m in modules]

    if modules:
        print(f"\nModules detected in {src_label + '/' if src_label else 'project root'}:")
        for name, _ in modules:
            print(f"  · {name}")
    else:
        print("\nNo modules detected yet. .brain/ structure will be created.")
        print("Re-run after creating your module directories to add AGENTS.md files.")

    # .brain/ structure --------------------------------------------------------
    print("\n.brain/ structure:")
    brain = os.path.join(project_root, ".brain")
    write(os.path.join(brain, "index.md"),        tpl_brain_index(module_names))
    write(os.path.join(brain, "architecture.md"), tpl_brain_architecture())
    write(os.path.join(brain, "connections.md"),  tpl_brain_connections(module_names))
    write(os.path.join(brain, "README.md"),
          "# .brain\n\nProject knowledge hub. See `index.md` for the overview.\n")
    decisions_dir = os.path.join(brain, "decisions")
    os.makedirs(decisions_dir, exist_ok=True)
    write(os.path.join(decisions_dir, "README.md"), tpl_decisions_readme())

    # Root AGENTS.md -----------------------------------------------------------
    print("\nRoot context:")
    write(os.path.join(project_root, "AGENTS.md"), tpl_root_agents(module_names))

    # Per-module AGENTS.md -----------------------------------------------------
    if modules:
        mode = "AI-generated from code" if generate else "template"
        print(f"\nModule context files ({mode}):")
        for name, path in modules:
            template = tpl_module_agents(name.title())
            out = os.path.join(path, "AGENTS.md")
            if generate:
                print(f"  generating {name}/AGENTS.md...")
                content = fill_with_claude(path, name.title(), template)
                write(out, content, overwrite=True)
            else:
                write(out, template)

    # Summary ------------------------------------------------------------------
    print("\n" + "─" * 60)
    print("Done.\n")
    if generate:
        print("Review every generated AGENTS.md — especially sections marked [?].")
        print("AI is good at 'Key flows' and 'Connections', weaker on 'Decisions'")
        print("and 'Gotchas'. Fill those in manually.\n")
    else:
        print("Fill in every [TODO] section in each AGENTS.md.")
        print("Priority order:")
        print("  1. Key flows  (most useful for the AI)")
        print("  2. What this module does NOT do (and why)  (prevents bad suggestions)")
        print("  3. Architectural decisions")
        print("  4. Gotchas\n")
        print("For AI-generated first drafts from your existing code:")
        print("  export ANTHROPIC_API_KEY=sk-...")
        print("  python setup_brain.py --generate\n")

    print("Commit everything to git. The .brain/ folder is team-shared knowledge.")
    print("Delete setup_brain.py from the repo after setup (or keep for re-runs).\n")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("#")]
    generate_flag = "--generate" in args
    path_args = [a for a in args if not a.startswith("--")]
    project_dir = path_args[0] if path_args else "."

    if not os.path.isdir(project_dir):
        print(f"Error: '{project_dir}' is not a directory.")
        sys.exit(1)

    run(project_dir, generate=generate_flag)
