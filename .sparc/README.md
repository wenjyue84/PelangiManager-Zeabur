# SPARC Framework for PelangiManager

**Use SPARC for:** Simple edits, bug fixes, small features, iterative improvements

## SPARC Phases

### 1. **Specification**
Define what needs to be done clearly and concisely.

**Template:**
```markdown
## Specification
**Goal:** [What needs to be accomplished]
**Scope:** [What's included/excluded]
**Success Criteria:** [How to verify it's done correctly]
**Constraints:** [Technical or business constraints]
```

### 2. **Pseudocode**
Plan the logic before writing actual code.

**Template:**
```markdown
## Pseudocode
**Approach:**
1. [Step-by-step logic]
2. [Key algorithms or patterns]
3. [Edge cases to handle]

**Data Flow:**
- Input: [What comes in]
- Process: [What happens]
- Output: [What goes out]
```

### 3. **Architecture**
Design the structure (lightweight for simple edits).

**Template:**
```markdown
## Architecture
**Files to Modify:**
- [file path] - [what changes]

**Dependencies:**
- [New imports or packages needed]

**Integration Points:**
- [How this connects to existing code]
```

### 4. **Refinement**
Implement with iteration and testing.

**Template:**
```markdown
## Refinement
**Implementation Steps:**
1. [Code change 1]
2. [Code change 2]
3. [Test and verify]

**Testing:**
- [ ] Unit tests pass
- [ ] Manual testing done
- [ ] No regressions
```

### 5. **Completion**
Finalize and document.

**Template:**
```markdown
## Completion
**Changes Made:**
- [Summary of actual changes]

**Testing Results:**
- [What was tested]
- [Results]

**Documentation:**
- [Any docs updated]

**Commit Message:**
```
[Conventional Commit format]
```
```

## SPARC Workflow for Common Tasks

### Bug Fix
1. **Spec:** Describe the bug and expected behavior
2. **Pseudocode:** Plan the fix logic
3. **Architecture:** Identify affected files (usually 1-2)
4. **Refinement:** Implement fix, test thoroughly
5. **Completion:** Verify, commit with `fix:` prefix

### Small Feature
1. **Spec:** Define feature requirements clearly
2. **Pseudocode:** Outline implementation approach
3. **Architecture:** Map component/file changes
4. **Refinement:** Build iteratively, test each step
5. **Completion:** Final testing, commit with `feat:` prefix

### Refactoring
1. **Spec:** What needs cleaning and why
2. **Pseudocode:** Plan extraction/reorganization
3. **Architecture:** Show before/after structure
4. **Refinement:** Refactor incrementally, test between changes
5. **Completion:** Verify no behavior changes, commit with `refactor:` prefix

## Integration with PelangiManager

### File Size Check
- Before SPARC work, check if file > 800 lines
- If so, consider BMAD for major refactoring instead

### Git Workflow
- Work on `main` branch (per project standards)
- Use Conventional Commits
- Include Claude co-author attribution

### Testing Requirements
- Run `npm test` before completion
- Run `npm run check` for TypeScript validation
- Manual browser testing for UI changes

## Quick Start

1. Create a `.sparc/tasks/` subdirectory for active work
2. Copy templates from this README
3. Fill out each phase as you work
4. Archive completed work to `.sparc/archive/`

## Tips

- Don't skip phases (even for small changes, mental clarity helps)
- Keep specification short but clear
- Use pseudocode to catch logic errors early
- Test incrementally in Refinement phase
- Archive completed SPARC docs for reference
