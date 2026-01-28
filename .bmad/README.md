# BMAD Framework for PelangiManager

**Use BMAD for:** Major features, complex refactoring, multi-file changes, architectural decisions

## BMAD Overview

BMAD (Breakthrough Method for Agile AI-Driven Development) simulates a full development team with specialized agents working together.

## Agent Roles

### 1. **Product Manager Agent**
- Defines requirements and user stories
- Prioritizes features
- Maintains product vision

### 2. **Architect Agent**
- Designs system architecture
- Makes technical decisions
- Ensures scalability and maintainability

### 3. **Developer Agent**
- Implements features
- Writes code following patterns
- Performs code reviews

### 4. **QA Agent**
- Creates test plans
- Writes test cases
- Validates functionality

### 5. **Scrum Master Agent**
- Coordinates workflow
- Tracks progress
- Removes blockers

## BMAD Workflow

### Phase 1: Analysis
**Product Manager + Architect**

```markdown
## Analysis Document

### User Story
**As a** [user type]
**I want** [goal]
**So that** [benefit]

### Requirements
**Functional:**
- [Requirement 1]
- [Requirement 2]

**Non-Functional:**
- Performance: [criteria]
- Security: [criteria]
- Scalability: [criteria]

### Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]

### Technical Constraints
- [Constraint 1]
- [Constraint 2]
```

### Phase 2: Planning
**Architect + Developer + Scrum Master**

```markdown
## Planning Document

### Architecture Design
**System Components:**
```
[Component diagram or description]
```

**Data Models:**
- [Model 1] - [Description]
- [Model 2] - [Description]

**API Endpoints:**
- `[METHOD] /api/[path]` - [Purpose]

**UI Components:**
- `[ComponentName]` - [Purpose]

### Technical Stack
**Frontend:**
- [Technologies]

**Backend:**
- [Technologies]

**Database:**
- [Schema changes]

### Task Breakdown
1. [Task 1] - [Estimated effort]
2. [Task 2] - [Estimated effort]
3. [Task 3] - [Estimated effort]

### Dependencies
- [Dependency 1]
- [Dependency 2]

### Risks
- [Risk 1] - [Mitigation]
- [Risk 2] - [Mitigation]
```

### Phase 3: Implementation
**Developer + QA**

```markdown
## Implementation Log

### Sprint Goal
[What will be accomplished]

### Implementation Tasks

#### Task 1: [Name]
**Status:** [Not Started | In Progress | Complete]
**Files Modified:**
- [file path] - [changes]

**Code Snippets:**
```[language]
[Key code]
```

**Tests Written:**
- [test description]

#### Task 2: [Name]
[Same structure as Task 1]

### Integration Points
- [How components connect]

### Code Review Checklist
- [ ] Follows TypeScript best practices
- [ ] No magic numbers or strings
- [ ] Error handling implemented
- [ ] Tests cover edge cases
- [ ] No security vulnerabilities
- [ ] Performance optimized
- [ ] Documentation updated
```

### Phase 4: Testing & Deployment
**QA + Developer + Scrum Master**

```markdown
## Testing & Deployment

### Test Plan
**Unit Tests:**
- [Test 1] - [Status]
- [Test 2] - [Status]

**Integration Tests:**
- [Test 1] - [Status]
- [Test 2] - [Status]

**Manual Testing:**
- [ ] [Scenario 1]
- [ ] [Scenario 2]

### Test Results
**Pass:** [count]
**Fail:** [count]

**Issues Found:**
- [Issue 1] - [Resolution]

### Deployment Checklist
- [ ] All tests passing
- [ ] TypeScript compilation successful
- [ ] Build succeeds (`npm run build`)
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Documentation updated

### Rollback Plan
[If deployment fails, how to revert]

### Post-Deployment Verification
- [ ] Feature works in production
- [ ] No performance degradation
- [ ] No new errors in logs
```

## BMAD for PelangiManager Use Cases

### Use Case 1: New Major Feature (e.g., Billing System)
1. **Analysis:** PM defines user stories for billing workflow
2. **Planning:** Architect designs invoice schema, payment integration
3. **Implementation:** Developer builds UI + API endpoints
4. **Testing:** QA validates payment flows, edge cases

### Use Case 2: Large Refactoring (e.g., Split 800+ line component)
1. **Analysis:** PM clarifies which features stay/go
2. **Planning:** Architect designs new component structure
3. **Implementation:** Developer extracts incrementally, maintains functionality
4. **Testing:** QA ensures no regressions

### Use Case 3: Architectural Change (e.g., Add WebSocket real-time updates)
1. **Analysis:** PM defines real-time requirements
2. **Planning:** Architect designs WebSocket integration with existing REST API
3. **Implementation:** Developer adds server + client WebSocket handling
4. **Testing:** QA validates real-time sync, connection handling

## Agent Coordination

### Context Management
- Each agent works from self-contained documents
- Architecture.md contains full context
- Agents don't re-read entire codebase
- Task sharding keeps work focused

### Multi-File Changes
- Track all modified files in Implementation Log
- Coordinate changes across frontend/backend
- Ensure consistent patterns

### Quality Gates
- Code must pass Developer review before QA
- QA must approve before deployment
- Scrum Master tracks blockers

## Integration with PelangiManager

### Project Structure
```
.bmad/
├── README.md (this file)
├── projects/
│   ├── [project-name]/
│   │   ├── analysis.md
│   │   ├── planning.md
│   │   ├── implementation.md
│   │   ├── testing.md
│   │   └── architecture.md
├── templates/
│   ├── analysis-template.md
│   ├── planning-template.md
│   ├── implementation-template.md
│   └── testing-template.md
└── archive/
    └── [completed-projects]/
```

### Git Workflow
- Create feature branch for major BMAD work
- Make incremental commits per task
- Use PR review process
- Merge to main when complete

### 800-Line Rule Compliance
- BMAD is REQUIRED for files > 800 lines
- Architect designs modular breakdown
- Developer implements extraction carefully
- QA validates no behavior changes

## Quick Start

1. Create `.bmad/projects/[feature-name]/` directory
2. Copy templates from `.bmad/templates/`
3. Start with analysis.md (PM Agent perspective)
4. Progress through phases systematically
5. Archive to `.bmad/archive/` when complete

## Tips

- Don't rush Analysis - clear requirements save time later
- Use Architect agent to make design decisions explicit
- Keep Implementation Log detailed for future reference
- QA mindset catches issues early
- Scrum Master view helps prioritize and unblock
