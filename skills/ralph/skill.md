# Ralph PRD Conversion Skill

Convert markdown PRD files to `prd.json` format for Ralph autonomous agent execution.

## When to use this skill

Use this skill when the user wants to:
- Convert a markdown PRD to JSON format
- Prepare a PRD for Ralph autonomous execution
- Update an existing prd.json with new stories

## How to invoke

```
Load the ralph skill and convert tasks/prd-[feature-name].md to prd.json
```

## What this skill does

1. **Reads the markdown PRD** from tasks/ directory
2. **Parses the structure** to extract:
   - Product name and overview
   - Goals
   - User stories with acceptance criteria
   - Technical notes and dependencies
3. **Generates prd.json** with proper structure for Ralph
4. **Validates the JSON** to ensure it's ready for autonomous execution

## prd.json Structure

```json
{
  "productName": "Feature Name",
  "branchName": "feature/feature-name",
  "overview": "Brief description",
  "goals": ["Goal 1", "Goal 2"],
  "userStories": [
    {
      "id": "US-001",
      "title": "Story title",
      "priority": 1,
      "description": "Detailed description",
      "acceptanceCriteria": ["Criterion 1", "Criterion 2"],
      "technicalNotes": ["Note 1", "Note 2"],
      "dependencies": [],
      "estimatedComplexity": "small|medium|large",
      "passes": false
    }
  ],
  "technicalContext": {
    "affectedAreas": ["file paths"],
    "testingStrategy": "description",
    "rollbackPlan": "description"
  }
}
```

## Quality Checks

The skill validates:
- ✅ Each story has unique ID
- ✅ Each story has clear acceptance criteria
- ✅ Dependencies reference valid story IDs
- ✅ Priority is set correctly
- ✅ Branch name follows git conventions
- ✅ All stories have `passes: false` initially
- ✅ UI stories include browser verification in acceptance criteria
- ✅ Stories are sized appropriately (not too large)

## After conversion

Tell the user:
1. Review `prd.json` to verify structure
2. Edit if needed to adjust stories or priorities
3. Run `./scripts/ralph/ralph.sh` to start autonomous development
4. Monitor progress in `progress.txt`

## Example interaction

**User**: Load the ralph skill and convert tasks/prd-guest-check-in.md to prd.json

**Claude**: I'll convert the PRD to JSON format for Ralph execution.

[Reads markdown PRD, parses structure, generates JSON]

✅ Created `prd.json` with:
- 5 user stories
- Branch: feature/guest-check-in
- All stories properly structured for autonomous execution

Quality checks:
✅ All stories have unique IDs
✅ Dependencies are valid
✅ UI stories include browser verification
✅ Stories are appropriately sized

Next steps:
1. Review prd.json
2. Run: ./scripts/ralph/ralph.sh --tool claude
3. Monitor progress in progress.txt

Ralph will:
- Create feature branch
- Implement stories one by one
- Run quality checks after each
- Commit changes automatically
- Update AGENTS.md with learnings

## Tips for good PRDs

### Story Sizing
- **Small**: 1-2 files, < 100 lines changed, < 1 hour
- **Medium**: 2-4 files, < 300 lines changed, 1-3 hours
- **Large**: 4+ files, > 300 lines changed, > 3 hours (split this!)

### Acceptance Criteria
- Be specific and testable
- Include "Verify in browser" for UI
- Include "Tests pass" for logic
- Include error cases

### Dependencies
- List all blocking stories
- Ralph won't start a story until dependencies pass
- Create logical order for implementation

### Technical Notes
- Point to relevant files
- Mention patterns to follow
- Call out security concerns
- Note performance requirements
