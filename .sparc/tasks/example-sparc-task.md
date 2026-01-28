# SPARC Example: Fix Bug - Past Date Selection in Check-in Form

**Status:** Example Template
**Created:** 2026-01-28

## 1. Specification

**Goal:** Prevent users from selecting past dates in the check-in form

**Scope:**
- ✅ Add date validation to check-in form
- ✅ Display error message for invalid dates
- ❌ No changes to check-out form (out of scope)

**Success Criteria:**
- Users cannot submit check-in form with past dates
- Clear error message shows when past date selected
- Validation works in all browsers

**Constraints:**
- Must use existing date-fns library (already in package.json)
- Must integrate with current react-hook-form setup
- No new dependencies allowed

---

## 2. Pseudocode

**Approach:**
```typescript
// In check-in form validation schema
1. Get today's date using date-fns startOfDay()
2. Compare selected check-in date with today
3. If selected date < today, return validation error
4. Otherwise, allow submission

// Error handling
- Display error message below date picker
- Prevent form submission until valid date selected
```

**Data Flow:**
- **Input:** User selects date from date picker
- **Process:** Zod validation runs, compares with today's date
- **Output:** Error message if invalid, or form submits if valid

**Edge Cases:**
- User selects today's date (should be allowed)
- User selects tomorrow (should be allowed)
- User selects yesterday (should be rejected)
- Timezone considerations (use local time)

---

## 3. Architecture

**Files to Modify:**
- `client/src/pages/check-in.tsx` - Add validation to form schema

**Dependencies:**
- date-fns: `startOfDay`, `isAfter`, `isSameDay` (already installed)
- No new packages needed

**Integration Points:**
- Integrates with existing Zod validation schema
- Works with react-hook-form error display
- No API changes needed (client-side validation only)

---

## 4. Refinement

**Implementation Steps:**

### Step 1: Add validation to Zod schema
```typescript
import { startOfDay, isAfter, isSameDay } from 'date-fns';

const checkInFormSchema = z.object({
  checkInDate: z.date()
    .refine((date) => {
      const today = startOfDay(new Date());
      const selectedDate = startOfDay(date);
      return isAfter(selectedDate, today) || isSameDay(selectedDate, today);
    }, {
      message: "Check-in date cannot be in the past. Please select today or a future date."
    }),
  // ... other fields
});
```

### Step 2: Test the validation
- [x] Test with past date (should show error)
- [x] Test with today's date (should pass)
- [x] Test with future date (should pass)
- [x] Test error message displays correctly

### Step 3: Verify integration
- [x] Form submission blocked on error
- [x] Form submission allowed when valid
- [x] Error message clears when user selects valid date

**Testing:**
- [x] Unit tests pass (if any exist)
- [x] Manual testing in browser
- [x] No regressions in check-in flow
- [x] TypeScript compiles without errors

---

## 5. Completion

**Changes Made:**
- Modified `client/src/pages/check-in.tsx`:
  - Added date-fns imports
  - Added validation refinement to checkInFormSchema
  - Error message displays automatically via react-hook-form

**Testing Results:**
- ✅ Past dates rejected with clear error message
- ✅ Today's date accepted
- ✅ Future dates accepted
- ✅ Error message clears on valid selection
- ✅ No TypeScript errors
- ✅ No impact on check-out form

**Documentation:**
- No documentation updates needed (straightforward validation)
- Added inline comment explaining validation logic

**Commit Message:**
```
fix: prevent past date selection in check-in form

Added validation to check-in form to prevent users from selecting
past dates. Uses date-fns to compare selected date with today.
Error message displays when invalid date selected.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

## Retrospective

**What Went Well:**
- Used existing libraries (no new dependencies)
- Validation integrated smoothly with react-hook-form
- Clear error messaging

**What Could Be Improved:**
- Could add similar validation to check-out form (future work)
- Could add unit tests for validation logic (future work)

**Time Spent:** ~45 minutes
