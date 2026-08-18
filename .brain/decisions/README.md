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
Created by setup_brain.py on 2026-08-18
