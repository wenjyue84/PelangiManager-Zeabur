# Hybrid SPARC + BMAD Workflow Guide for PelangiManager

**Last Updated:** 2026-01-28

## Quick Decision Matrix

Use this decision tree to choose between SPARC and BMAD:

```
Is the change affecting > 3 files?
├─ NO → Is it a bug fix or small feature?
│       └─ YES → Use SPARC ✨
│
└─ YES → Is it a major architectural change or new feature module?
         ├─ YES → Use BMAD 🏗️
         └─ NO → Use SPARC ✨ (but document well)

Is the file > 800 lines and needs refactoring?
└─ YES → Use BMAD 🏗️ (required by project standards)

Is this a quick fix or hotfix?
└─ YES → Use SPARC ✨ (speed matters)

Does this require complex architectural decisions?
└─ YES → Use BMAD 🏗️ (leverage architect agent)
```

## When to Use SPARC ✨

### Characteristics
- ✅ **Simple edits** (1-3 files)
- ✅ **Bug fixes** (localized issues)
- ✅ **Small features** (single component/endpoint)
- ✅ **Quick iterations** (need fast turnaround)
- ✅ **Refactoring** (under 800 lines, not major restructuring)
- ✅ **UI tweaks** (styling, layout adjustments)
- ✅ **Hotfixes** (production issues need immediate fix)

### Examples for PelangiManager

#### Example 1: Bug Fix - Check-in Date Validation
**Issue:** Users can select check-in dates in the past
**SPARC Approach:**
1. **Spec:** Add date validation to check-in form
2. **Pseudocode:** Use date-fns to compare selected date with today
3. **Architecture:** Modify `client/src/pages/check-in.tsx` form validation
4. **Refinement:** Implement, test with various dates
5. **Completion:** Verify, commit with `fix: prevent past check-in dates`

**Estimated Time:** 30 minutes - 1 hour

#### Example 2: Small Feature - Export Guest List to CSV
**Issue:** Need to export guest data for reporting
**SPARC Approach:**
1. **Spec:** Add "Export CSV" button to guest list page
2. **Pseudocode:** Use csv-stringify library to convert JSON to CSV
3. **Architecture:** Add export function to `client/src/pages/guests.tsx`
4. **Refinement:** Implement export, test with various data sizes
5. **Completion:** Verify download works, commit with `feat: add guest list CSV export`

**Estimated Time:** 1-2 hours

#### Example 3: Refactoring - Extract Form Component
**Issue:** Check-in form is getting complex (500 lines)
**SPARC Approach:**
1. **Spec:** Extract guest information fields into reusable component
2. **Pseudocode:** Identify form fields, create `GuestInfoForm` component
3. **Architecture:** Create `client/src/components/forms/GuestInfoForm.tsx`
4. **Refinement:** Extract incrementally, ensure react-hook-form integration works
5. **Completion:** Test both check-in and check-out flows, commit with `refactor: extract guest info form component`

**Estimated Time:** 2-3 hours

## When to Use BMAD 🏗️

### Characteristics
- ✅ **Major features** (new modules/systems)
- ✅ **Architectural changes** (affects system design)
- ✅ **Multi-file changes** (4+ files, complex interactions)
- ✅ **Large refactoring** (files > 800 lines, required by project standards)
- ✅ **Database schema changes** (migrations + backend + frontend)
- ✅ **Third-party integrations** (payment gateways, APIs)
- ✅ **Complex business logic** (multiple edge cases, workflows)

### Examples for PelangiManager

#### Example 1: Major Feature - Billing & Invoice System
**Scope:** Complete billing module with invoices, payments, receipts
**BMAD Approach:**

**Analysis (Product Manager):**
- User story: "As a hostel manager, I want to generate invoices for guests"
- Requirements: Invoice CRUD, payment tracking, receipt generation
- Acceptance criteria: Can create/edit/delete invoices, track payment status

**Planning (Architect):**
- Database: New `invoices`, `payments` tables
- Backend: `/api/billing/` endpoints
- Frontend: `client/src/pages/billing/` module
- Integration: Stripe for payment processing
- Task breakdown: 4 phases, 15 tasks total

**Implementation (Developer):**
- Phase 1: Database + migrations
- Phase 2: Backend API
- Phase 3: Frontend UI
- Phase 4: Stripe integration

**Testing (QA):**
- Unit tests for API endpoints
- Integration tests for payment flow
- Manual testing for UI/UX

**Estimated Time:** 2-3 weeks

#### Example 2: Large Refactoring - Split 850-line Settings Component
**Issue:** `client/src/pages/settings.tsx` is 850 lines (exceeds 800-line rule)
**BMAD Approach:**

**Analysis (Product Manager):**
- Why: Violates project standards, hard to maintain
- Requirements: Break into smaller, focused components
- Out of scope: No new features, pure refactoring

**Planning (Architect):**
- Split into tabs: UserSettings, SystemSettings, NotificationSettings, etc.
- Create `client/src/pages/settings/` directory
- Maintain existing functionality exactly

**Implementation (Developer):**
- Extract one tab at a time
- Test after each extraction
- Ensure no regressions

**Testing (QA):**
- Verify all settings still work
- Check no UI changes
- Test edge cases

**Estimated Time:** 1 week

#### Example 3: Architectural Change - Add WebSocket Real-time Updates
**Scope:** Real-time capsule status updates without page refresh
**BMAD Approach:**

**Analysis (Product Manager):**
- User story: "As a staff member, I want to see capsule status update in real-time"
- Business value: Reduces manual refreshes, improves efficiency
- Requirements: WebSocket server, client subscription, status broadcasting

**Planning (Architect):**
- Backend: WebSocket server using `ws` library
- Protocol: Subscribe to capsule updates, broadcast on status change
- Frontend: WebSocket client hook, auto-update UI
- Fallback: Polling if WebSocket connection fails

**Implementation (Developer):**
- Server: Setup WebSocket server in `server/index.ts`
- Client: Create `useCapsuleUpdates` hook
- Integration: Update capsule status components

**Testing (QA):**
- Test connection/disconnection handling
- Test concurrent updates
- Test network failure scenarios

**Estimated Time:** 1-2 weeks

## Framework Directory Structure

```
PelangiManager/
├── .sparc/
│   ├── README.md               # SPARC methodology guide
│   ├── tasks/                  # Active SPARC work
│   │   └── [task-name].md      # Individual task documentation
│   └── archive/                # Completed SPARC tasks
│       └── [YYYY-MM]/          # Organized by month
│
├── .bmad/
│   ├── README.md               # BMAD methodology guide
│   ├── templates/              # BMAD phase templates
│   │   ├── analysis-template.md
│   │   ├── planning-template.md
│   │   ├── implementation-template.md
│   │   └── testing-template.md
│   ├── projects/               # Active BMAD projects
│   │   └── [project-name]/     # One directory per major feature
│   │       ├── analysis.md
│   │       ├── planning.md
│   │       ├── implementation.md
│   │       └── testing.md
│   └── archive/                # Completed BMAD projects
│       └── [YYYY-MM]/
│
└── HYBRID-WORKFLOW-GUIDE.md    # This file
```

## Workflow Integration with PelangiManager

### SPARC Workflow

1. **Create Task Document**
   ```bash
   # Create new SPARC task
   touch .sparc/tasks/fix-check-in-date-validation.md
   ```

2. **Follow SPARC Phases**
   - Fill out Specification
   - Write Pseudocode
   - Design Architecture (lightweight)
   - Implement with Refinement
   - Complete and commit

3. **Archive on Completion**
   ```bash
   # Move to archive
   mkdir -p .sparc/archive/2026-01
   mv .sparc/tasks/fix-check-in-date-validation.md .sparc/archive/2026-01/
   ```

### BMAD Workflow

1. **Create Project Directory**
   ```bash
   # Create new BMAD project
   mkdir -p .bmad/projects/billing-system
   cd .bmad/projects/billing-system

   # Copy templates
   cp ../../templates/analysis-template.md analysis.md
   cp ../../templates/planning-template.md planning.md
   cp ../../templates/implementation-template.md implementation.md
   cp ../../templates/testing-template.md testing.md
   ```

2. **Follow BMAD Phases**
   - **Analysis:** Product Manager perspective, define requirements
   - **Planning:** Architect perspective, design system
   - **Implementation:** Developer perspective, build feature
   - **Testing:** QA perspective, verify quality

3. **Archive on Completion**
   ```bash
   # Move to archive
   mkdir -p .bmad/archive/2026-01
   mv .bmad/projects/billing-system .bmad/archive/2026-01/
   ```

## Git Workflow Integration

### SPARC Commits
```bash
# Work on main branch (project standard)
git add [files]
git commit -m "fix: prevent past check-in dates

Implemented date validation in check-in form using date-fns.
Users can no longer select dates before today.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### BMAD Commits (Major Features)
```bash
# Consider feature branch for major work
git checkout -b feature/billing-system

# Make incremental commits
git commit -m "feat(billing): add invoice schema and migrations"
git commit -m "feat(billing): implement billing API endpoints"
git commit -m "feat(billing): create billing dashboard UI"

# When complete, merge to main
git checkout main
git merge feature/billing-system

# Or create PR for review
gh pr create --title "feat: Add billing and invoice system"
```

## Testing Requirements by Framework

### SPARC Testing
- **Unit Tests:** If touching logic (run `npm test`)
- **Type Check:** Always (`npm run check`)
- **Manual Testing:** Browser testing for UI changes
- **Regression:** Quick check that related features still work

### BMAD Testing
- **Unit Tests:** Required for all new code
- **Integration Tests:** Required for multi-component features
- **E2E Tests:** Consider for critical user flows
- **Type Check:** Always (`npm run check`)
- **Manual Testing:** Comprehensive testing of all scenarios
- **Performance:** Measure before/after for large changes

## Quality Gates

### SPARC Quality Gates
- ✅ TypeScript compiles without errors
- ✅ Tests pass (if tests exist)
- ✅ Manual testing confirms fix/feature works
- ✅ No obvious regressions
- ✅ Commit message follows Conventional Commits

### BMAD Quality Gates
- ✅ All BMAD phases completed and documented
- ✅ Code review by another agent/perspective
- ✅ All tests passing (unit + integration)
- ✅ TypeScript compiles without errors
- ✅ Production build succeeds (`npm run build`)
- ✅ No files exceed 800-line limit
- ✅ Documentation updated
- ✅ Acceptance criteria met

## Hybrid Workflow Tips

### When in Doubt
- **Start with SPARC** - It's faster and less overhead
- **Upgrade to BMAD** if complexity grows beyond initial estimate
- **Don't over-engineer** - Use the simplest approach that works

### Mixing Frameworks
You can use BMAD planning with SPARC execution for medium-complexity work:
1. Use BMAD Analysis + Planning to think through the problem
2. Use SPARC for actual implementation if scope is manageable
3. This gives you architectural clarity without heavy overhead

### Tracking Progress
- **SPARC:** Use simple checklist in task markdown file
- **BMAD:** Use Implementation Log's task tracking system
- **Both:** Consider using Claude Code's TodoWrite for active coding sessions

### Collaboration
- **SPARC:** Solo-friendly, fast iteration
- **BMAD:** Better for multi-stakeholder projects, distributed teams
- **PelangiManager Context:** You're solo dev, so prefer SPARC unless complexity demands BMAD

### Archive Strategy
- Archive monthly to keep active directories clean
- Keep archive organized by `YYYY-MM/` folders
- Reference old archives when similar work comes up

## Real-World Scenarios

### Scenario 1: Production Bug
**Situation:** Guest check-out crashes when printing receipt
**Framework:** SPARC ✨
**Reason:** Urgent fix needed, likely 1-2 file change, clear scope
**Time:** 30 minutes - 1 hour

### Scenario 2: New Feature Request
**Situation:** Boss wants online booking system with payment integration
**Framework:** BMAD 🏗️
**Reason:** Major feature, database changes, third-party API, multi-week effort
**Time:** 3-4 weeks

### Scenario 3: Code Cleanup
**Situation:** Component reached 650 lines, getting messy
**Framework:** SPARC ✨
**Reason:** Under 800 lines, straightforward extraction, no new features
**Time:** 2-3 hours

### Scenario 4: Mandatory Refactoring
**Situation:** Component is 920 lines (violates 800-line rule)
**Framework:** BMAD 🏗️
**Reason:** Project standard requires BMAD for files > 800 lines
**Time:** 4-6 hours (or more depending on complexity)

### Scenario 5: Optimization Request
**Situation:** Capsule list page is slow with 500+ capsules
**Framework:** SPARC ✨ first, upgrade to BMAD 🏗️ if needed
**Reason:** Start with profiling (SPARC), may need architectural change (BMAD)
**Time:** Variable, assess after investigation

## Performance Optimization

### SPARC Performance
- **Documentation Overhead:** ~5-10 minutes
- **Best For:** Tasks under 3 hours total time
- **ROI:** High for small, frequent changes

### BMAD Performance
- **Documentation Overhead:** ~30-60 minutes
- **Best For:** Tasks over 1 day total time
- **ROI:** High for complex, multi-week projects

### Optimization Tips
- Don't over-document SPARC tasks (keep it lightweight)
- Do thoroughly document BMAD projects (future reference)
- Use templates to speed up both frameworks
- Archive regularly to reduce cognitive load

## Success Metrics

Track these metrics to evaluate framework effectiveness:

### SPARC Metrics
- **Time to commit:** How long from start to commit?
- **Regression rate:** How often do SPARC changes break things?
- **Documentation quality:** Is it enough to understand the change later?

### BMAD Metrics
- **Completion rate:** Are BMAD projects finishing on time?
- **Bug rate:** How many bugs found post-deployment?
- **Scope creep:** Are projects staying within planned scope?

### Overall Metrics
- **Developer velocity:** Are you shipping faster?
- **Code quality:** Fewer bugs, better structure?
- **Technical debt:** Is it decreasing?

## Getting Help

### When Stuck
1. **Review this guide** - Re-read decision matrix
2. **Check examples** - Find similar scenario
3. **Start with SPARC** - Can always upgrade to BMAD
4. **Ask Claude** - "Is this SPARC or BMAD work?"

### Framework Evolution
These frameworks should evolve with your needs:
- Add new templates as patterns emerge
- Adjust decision criteria based on experience
- Archive outdated approaches
- Share learnings in retrospectives

## Conclusion

**Remember:**
- SPARC = Speed and simplicity ⚡
- BMAD = Rigor and thoroughness 🏗️
- Hybrid = Best of both worlds 🎯

**Most Important:**
Choose the right tool for the job, but don't let process slow you down. These frameworks exist to help you ship better code faster, not to create busywork.

When in doubt, start simple (SPARC) and add rigor (BMAD) only when complexity demands it.

---

**Quick Reference Card**

```
╔═══════════════════════════════════════════════════════════╗
║  SPARC ✨            |  BMAD 🏗️                           ║
║  • 1-3 files          |  • 4+ files                        ║
║  • < 800 lines        |  • > 800 lines (required)          ║
║  • Bug fixes          |  • Major features                  ║
║  • Small features     |  • Architecture changes            ║
║  • Quick iterations   |  • Complex business logic          ║
║  • Hours to 1 day     |  • Days to weeks                   ║
║  • Solo work          |  • Multi-stakeholder               ║
╚═══════════════════════════════════════════════════════════╝
```
