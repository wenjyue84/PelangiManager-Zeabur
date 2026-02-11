# Rainbow Template Management - Testing Guide

## 🎯 Quick Test Steps

### 1. Open Rainbow Admin
Navigate to: **http://localhost:3002/admin/rainbow/intents**

### 2. Verify Template Buttons
You should see:
- ✅ **T1 Smartest** button (system template)
- ✅ **T2 Performance** button (system template)
- ✅ **+ Save New Template** button in the top right

If you previously had "T3 Custom" saved, it should be auto-migrated and appear as a custom template.

### 3. Test Saving a Template

#### Step 1: Configure Routing
1. Modify some intent routing (change "LLM Reply" to "Static Reply" or vice versa)
2. Don't apply any template yet

#### Step 2: Save Template
1. Click **"+ Save New Template"**
2. Enter a name like **"My Test Setup"**
3. Click **"Save Template"**

**Expected Result:**
- ✅ Success toast: "Template 'My Test Setup' saved successfully."
- ✅ New button appears: **"My Test Setup"** with delete icon (X) on hover
- ✅ Modal closes

#### Step 3: Verify Delete Button
1. Hover over your **"My Test Setup"** button
2. Delete icon (X) should appear

**Expected Result:**
- ✅ Delete icon appears on hover for custom templates
- ❌ Delete icon does NOT appear for T1 Smartest or T2 Performance

### 4. Test Applying a Template

1. Click **"T1 Smartest"** button
2. Confirm the dialog showing intent changes
3. Wait for routing to update

**Expected Result:**
- ✅ Confirmation dialog shows affected intents
- ✅ Toast: "T1 Smartest applied — X intent(s) updated."
- ✅ Intents table updates with new routing
- ✅ "T1 Smartest" button highlights (blue/primary color)
- ✅ Indicator shows: "Active template: T1 Smartest"

### 5. Test Deleting a Template

1. Hover over **"My Test Setup"** button
2. Click the **X** icon
3. Confirm deletion

**Expected Result:**
- ✅ Confirmation dialog: "Delete template 'My Test Setup'? This cannot be undone."
- ✅ Toast: "Template 'My Test Setup' deleted."
- ✅ Button disappears from list
- ✅ Template removed from localStorage

### 6. Test System Template Protection

Try to:
1. Create a template named **"T1 Smartest"** or **"smartest"**
2. Create a template named **"T2 Performance"** or **"performance"**

**Expected Result:**
- ❌ Error toast: "This name is reserved for system templates."

### 7. Test Duplicate Name Detection

1. Save a template: **"Weekend Mode"**
2. Try to save another template: **"Weekend Mode"**

**Expected Result:**
- ❌ Error toast: "A template with this name already exists."

### 8. Test Active Template Detection

1. Apply **"T2 Performance"** template
2. Refresh the page
3. Go back to Intents & Routing tab

**Expected Result:**
- ✅ "T2 Performance" button is highlighted (blue/primary color)
- ✅ Indicator shows: "Active template: T2 Performance"

### 9. Test Template Migration (if applicable)

If you previously had "T3 Custom" saved:
1. Open browser console (F12)
2. Run: `localStorage.getItem('rainbow_custom_template')`

**Expected Result:**
- ❌ Returns `null` (old key deleted)
- ✅ Old T3 Custom is now in new format as a custom template

## 🐛 Common Issues

### Issue 1: Templates Not Appearing
**Cause:** JavaScript error or localStorage corrupted

**Fix:**
1. Open browser console (F12)
2. Check for errors (red text)
3. Clear localStorage: `localStorage.removeItem('rainbow_saved_templates')`
4. Refresh page

### Issue 2: Can't Delete System Templates
**Expected Behavior:** This is correct! T1 Smartest and T2 Performance cannot be deleted.

### Issue 3: Template Not Highlighting After Apply
**Cause:** Active template detection failed

**Fix:**
1. Open browser console (F12)
2. Run: `detectActiveTemplate()`
3. Check console for errors

### Issue 4: Save Template Button Missing
**Cause:** Modal not added or server not restarted

**Fix:**
1. Ensure server was restarted after code changes
2. Hard refresh browser: `Ctrl + Shift + R`
3. Clear browser cache

## 🔍 Browser Console Debugging

Open browser console (F12) and run:

```javascript
// View all saved templates
console.table(JSON.parse(localStorage.getItem('rainbow_saved_templates')))

// Check if functions exist
console.log(typeof renderTemplateButtons) // Should be "function"
console.log(typeof saveTemplates)         // Should be "function"
console.log(typeof deleteTemplate)        // Should be "function"

// Force re-render
renderTemplateButtons()

// Check active template
detectActiveTemplate()

// View cached routing
console.log(cachedRouting)
```

## ✅ Success Criteria

All of these should work:
- [x] Save multiple custom templates
- [x] Delete custom templates
- [x] Apply system templates (T1, T2)
- [x] Apply custom templates
- [x] Active template detection and highlighting
- [x] System template protection (cannot delete T1, T2)
- [x] Duplicate name detection
- [x] Reserved name detection
- [x] Template migration from old T3 Custom
- [x] Template buttons render on page load
- [x] Delete icon only appears on custom templates

## 📸 Expected UI

### Before Saving Templates:
```
Routing Templates                                    [+ Save New Template]
───────────────────────────────────────────────────────────────────────────
[T1 Smartest] [T2 Performance]
```

### After Saving Templates:
```
Routing Templates                                    [+ Save New Template]
───────────────────────────────────────────────────────────────────────────
[T1 Smartest] [T2 Performance] | [My Booking Setup ❌] [Weekend Mode ❌]
                                   (hover to show X)
```

### Active Template (e.g., T2 Performance):
```
Routing Templates                                    [+ Save New Template]
───────────────────────────────────────────────────────────────────────────
[T1 Smartest] [🔵 T2 Performance 🔵] | [My Booking Setup ❌] [Weekend Mode ❌]
                   (highlighted)

Active template: T2 Performance
```

## 📝 Test Report Template

Copy this and fill in results:

```
Date: __________
Tester: __________
Browser: __________

Feature                          | Status | Notes
─────────────────────────────────|────────|──────
Save new template                | ☐ ✅ ❌ |
Delete custom template           | ☐ ✅ ❌ |
Apply T1 Smartest                | ☐ ✅ ❌ |
Apply T2 Performance             | ☐ ✅ ❌ |
Apply custom template            | ☐ ✅ ❌ |
Active template highlighting     | ☐ ✅ ❌ |
System template protection       | ☐ ✅ ❌ |
Duplicate name detection         | ☐ ✅ ❌ |
Reserved name detection          | ☐ ✅ ❌ |
T3 Custom migration              | ☐ ✅ ❌ | N/A if no old T3
Delete icon only on custom       | ☐ ✅ ❌ |

Overall Result: ☐ Pass  ☐ Fail
```
