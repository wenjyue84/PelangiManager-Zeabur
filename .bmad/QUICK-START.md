# BMAD Quick Start Guide

## What is BMAD?

**BMAD** = Breakthrough Method for Agile AI-Driven Development

A comprehensive methodology using multi-agent perspectives for complex feature development.

## When to Use BMAD

✅ Major features (4+ files)
✅ Files > 800 lines (required by project standards)
✅ Architectural changes
✅ Complex business logic
✅ Multi-week projects

❌ Simple bug fixes → Use SPARC instead
❌ Quick iterations → Use SPARC instead
❌ Single file changes → Use SPARC instead

## Quick Start (2 minutes)

1. **Create project directory:**
   ```bash
   mkdir -p .bmad/projects/billing-system
   cd .bmad/projects/billing-system
   ```

2. **Copy templates:**
   ```bash
   cp ../../templates/analysis-template.md analysis.md
   cp ../../templates/planning-template.md planning.md
   cp ../../templates/implementation-template.md implementation.md
   cp ../../templates/testing-template.md testing.md
   ```

3. **Follow phases in order:**
   - **Analysis** (Product Manager perspective)
   - **Planning** (Architect perspective)
   - **Implementation** (Developer perspective)
   - **Testing** (QA perspective)

4. **Archive when complete:**
   ```bash
   mkdir -p ../../archive/2026-01
   mv ../billing-system ../../archive/2026-01/
   ```

## Agent Perspectives

### Product Manager (Analysis)
**Mindset:** "What does the user need?"
**Output:** User stories, requirements, acceptance criteria

### Architect (Planning)
**Mindset:** "How should this be built?"
**Output:** System design, database schema, API design

### Developer (Implementation)
**Mindset:** "How do I build this?"
**Output:** Code, tests, integration

### QA (Testing)
**Mindset:** "Does it work correctly?"
**Output:** Test plans, bug reports, deployment verification

### Scrum Master (Coordination)
**Mindset:** "What's blocking progress?"
**Output:** Progress tracking, risk mitigation

## BMAD Workflow

```
┌─────────────┐
│  Analysis   │  Product Manager defines requirements
└──────┬──────┘
       │
┌──────▼──────┐
│  Planning   │  Architect designs system
└──────┬──────┘
       │
┌──────▼──────────┐
│ Implementation │  Developer builds feature
└──────┬──────────┘
       │
┌──────▼────────┐
│   Testing     │  QA validates & deploys
└───────────────┘
```

## Templates Overview

### analysis-template.md
- User stories
- Requirements (functional + non-functional)
- Acceptance criteria
- Risks and constraints

### planning-template.md
- Architecture design
- Database schema
- API endpoints
- Task breakdown
- Risk assessment

### implementation-template.md
- Sprint goal
- Task-by-task implementation log
- Code snippets
- Issues encountered
- Performance metrics

### testing-template.md
- Test plan (unit, integration, manual)
- Test results
- Deployment checklist
- Rollback plan
- Post-deployment monitoring

## Example

See `.bmad/projects/example-billing-system/` for a complete example project structure.

## Tips

### Context Management
- Each phase builds on the previous one
- Keep architecture.md as single source of truth
- Reference completed phases in later work

### Task Sharding
- Break large features into small, focused tasks
- Each task should be completable in 2-4 hours
- Test after each task completion

### Quality Gates
- Don't skip phases (rigor pays off)
- Get "approval" from each agent perspective
- Document decisions for future reference

## Common Pitfalls

❌ **Rushing Analysis** - Poor requirements = wasted implementation time
❌ **Skipping Planning** - Lack of design = messy, hard-to-maintain code
❌ **No Testing Plan** - Bugs found in production instead of pre-deployment
❌ **Not Tracking Issues** - Same problems repeat without learning

## Integration with PelangiManager

### 800-Line Rule Enforcement
- BMAD is **required** for files > 800 lines
- Use Architect perspective to design modular breakdown
- Document before/after structure in Planning phase

### Git Workflow
- Consider feature branch for major BMAD work
- Make incremental commits per Implementation task
- Use PR review process for team visibility

### Testing Requirements
- Unit tests required for all new code
- Integration tests for multi-component features
- TypeScript compilation must pass
- Production build must succeed

## Multi-Week Projects

For projects spanning multiple weeks:

1. **Week 1:** Analysis + Planning (thorough design)
2. **Week 2-N:** Implementation (incremental build)
3. **Final Week:** Testing + Deployment (comprehensive QA)

Track progress in `implementation.md` to maintain momentum.

## Need Help?

- Review `HYBRID-WORKFLOW-GUIDE.md` for decision criteria
- Check `.bmad/projects/example-billing-system/` for reference
- Start with Analysis phase (don't jump to code)
- Ask Claude: "Help me plan this using BMAD methodology"
