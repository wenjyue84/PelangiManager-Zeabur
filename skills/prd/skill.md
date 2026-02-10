# PRD Generation Skill

Generate detailed Product Requirements Documents (PRDs) for features that will be implemented by Ralph autonomous agent.

## When to use this skill

Use this skill when the user wants to:
- Create a PRD for a new feature
- Document requirements before implementation
- Prepare a feature for autonomous development via Ralph

## How to invoke

```
Load the prd skill and create a PRD for [feature description]
```

## What this skill does

1. **Asks clarifying questions** about the feature:
   - What problem does this solve?
   - Who are the users?
   - What are the key user flows?
   - What are the success criteria?
   - Are there any technical constraints?

2. **Generates a detailed PRD** with:
   - Product name and overview
   - Goals and success metrics
   - User stories with acceptance criteria
   - Technical notes and context
   - Testing strategy

3. **Saves to tasks/** directory as `tasks/prd-[feature-name].md`

## Output format

The PRD includes:
- **Overview**: What the feature does and why
- **Goals**: Measurable outcomes
- **User Stories**: Broken down into small, implementable chunks
- **Acceptance Criteria**: Clear definition of done for each story
- **Technical Context**: Implementation guidance
- **Dependencies**: Story relationships
- **Complexity Estimates**: Small/Medium/Large sizing

## Best practices for Ralph

### Story Size
Each user story should be:
- ✅ Completable in one context window
- ✅ Testable with clear pass/fail criteria
- ✅ Focused on a single feature or change

Examples of RIGHT-SIZED stories:
- "Add a database column and migration"
- "Create a UI component with validation"
- "Add a filter dropdown to existing list"
- "Update API endpoint with new field"

Examples of TOO LARGE (split these):
- ❌ "Build the entire dashboard"
- ❌ "Add authentication system"
- ❌ "Refactor the entire API"

### Acceptance Criteria
Each story must have:
- Clear, testable conditions
- For UI stories: "Verify in browser using dev-browser skill"
- For API stories: "Tests cover happy path and errors"
- For data stories: "Migration runs successfully"

### Technical Notes
Provide guidance on:
- Which files/directories to modify
- Existing patterns to follow
- Libraries or tools to use
- Security considerations
- Performance requirements

## After generating the PRD

Tell the user:
1. Review the PRD in `tasks/prd-[feature-name].md`
2. Edit as needed to clarify requirements
3. Use the Ralph skill to convert it to `prd.json`
4. Run `./scripts/ralph/ralph.sh` to start autonomous development

## Example interaction

**User**: Load the prd skill and create a PRD for guest check-in flow

**Claude**: I'll help you create a detailed PRD for the guest check-in flow. Let me ask a few clarifying questions:

1. What problem does this solve?
2. What are the key steps in the check-in flow?
3. What information do we need to collect from guests?
4. Are there any integrations needed (payment, ID verification, etc.)?
5. What are the success criteria?

[After answers, generates detailed PRD with user stories]

✅ PRD saved to `tasks/prd-guest-check-in.md`

Next steps:
1. Review and edit the PRD if needed
2. Run: Load the ralph skill to convert it to prd.json
3. Run: ./scripts/ralph/ralph.sh to start autonomous development
