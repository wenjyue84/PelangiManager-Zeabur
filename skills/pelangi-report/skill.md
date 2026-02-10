---
name: pelangi-report
description: Generate reports for Pelangi Capsule Hostel. Use when the user asks for guest reports, occupancy status, current guests, overdue guests, outstanding payments, maintenance issues, or any hostel status report. Triggers on "guest report", "who is staying", "occupancy", "overdue", "outstanding payments", "maintenance report", "hostel status".
---

# Pelangi Hostel Report Generator

Generate comprehensive reports for Pelangi Capsule Hostel by querying the production database.

## Available Reports

1. **Guest Report** - Current guests, occupancy, checkouts, payments
2. **Maintenance Report** - Active capsule problems and issues
3. **Full Status Report** - Combined guest + maintenance overview

## Execution

### Step 1: Run the Query Script

Execute the report script from the project root:

```bash
node skills/pelangi-report/scripts/query-report.js [report-type]
```

Report types:
- `guests` - Guest and occupancy report (default)
- `maintenance` - Maintenance issues report
- `full` - Complete status report

### Step 2: Format the Output

Present the JSON output as a formatted markdown report with:

**For Guest Reports:**
- Occupancy summary table (total guests, capsules, occupancy rate)
- Current guests table (capsule, name, nationality, check-in, checkout, payment status)
- Overdue guests section (highlighted with days overdue)
- Outstanding payments summary with total

**For Maintenance Reports:**
- Active issues count
- Issues table (capsule, description, reported date, reporter)
- Priority recommendations based on issue type

**For Full Reports:**
- Combine both sections with executive summary

### Step 3: Action Items

Always conclude with actionable recommendations:
- Urgent follow-ups for overdue guests
- Today's expected checkouts
- Outstanding payment collection priorities
- Maintenance issues requiring immediate attention

## Database Connection

The script uses `DATABASE_URL` from `local.env`:
```
postgresql://neondb_owner:***@ep-calm-star-afnavipz.c-2.us-west-2.aws.neon.tech/neondb
```

## Example Output Format

```markdown
## Pelangi Capsule Hostel - Guest Report
**Report Date:** YYYY-MM-DD

### Occupancy Summary
| Metric | Value |
|--------|-------|
| Total Guests | X |
| Occupancy Rate | X% |

### Current Guests
| Capsule | Guest | Check-in | Checkout | Status |
...

### Action Items
1. URGENT: ...
2. TODAY: ...
```
