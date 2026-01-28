# SPARC Quick Start Guide

## What is SPARC?

**SPARC** = Specification, Pseudocode, Architecture, Refinement, Completion

A lightweight methodology for fast, iterative development of simple features and bug fixes.

## When to Use SPARC

✅ Bug fixes
✅ Small features (1-3 files)
✅ Quick iterations
✅ Files under 800 lines
✅ Simple refactoring

❌ Major features → Use BMAD instead
❌ Files > 800 lines → Use BMAD instead
❌ Architectural changes → Use BMAD instead

## Quick Start (30 seconds)

1. **Create task file:**
   ```bash
   cd .sparc/tasks
   touch fix-date-validation.md
   ```

2. **Fill out 5 phases:**
   - Specification (what to do)
   - Pseudocode (how to do it)
   - Architecture (where to change)
   - Refinement (implement & test)
   - Completion (commit & close)

3. **Archive when done:**
   ```bash
   mkdir -p ../archive/2026-01
   mv fix-date-validation.md ../archive/2026-01/
   ```

## Template (Copy/Paste)

```markdown
# [Task Title]

## 1. Specification
**Goal:** [What needs to be done]
**Scope:** [What's included/excluded]
**Success Criteria:** [How to verify it's done]

## 2. Pseudocode
**Approach:**
1. [Step 1]
2. [Step 2]

**Edge Cases:**
- [Edge case 1]

## 3. Architecture
**Files to Modify:**
- [file path] - [what changes]

## 4. Refinement
**Implementation Steps:**
1. [Change 1]
2. [Change 2]

**Testing:**
- [ ] Tests pass
- [ ] Manual testing done

## 5. Completion
**Changes Made:**
- [Summary]

**Commit Message:**
```
[Conventional Commit]
```
```

## Example

See `example-sparc-task.md` for a complete example of fixing a date validation bug.

## Tips

- Keep it lightweight (5-10 minutes to document)
- Focus on clarity over perfection
- Test between Refinement steps
- Archive completed work monthly
- Use for learning: review archived tasks to see patterns

## Common Pitfalls

❌ **Skipping phases** - Even for small tasks, mental clarity helps
❌ **Over-documenting** - Keep it concise, not a dissertation
❌ **Not testing** - Always verify before committing
❌ **Forgetting to archive** - Keep active directory clean

## Integration with PelangiManager

- Follows Conventional Commits (feat/fix/refactor)
- Respects 800-line rule (upgrade to BMAD if needed)
- Works on `main` branch
- Includes Claude co-author attribution

## Need Help?

- Review `HYBRID-WORKFLOW-GUIDE.md` for decision criteria
- Check `example-sparc-task.md` for reference
- Ask Claude: "Is this SPARC or BMAD work?"
