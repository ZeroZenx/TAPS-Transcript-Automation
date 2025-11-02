# TAPS Pages Specification Checklist

## ✅ Submit Request (Student)
- [x] Page title: "Submit Request"
- [x] Student ID field (editable)
- [x] Student Email (read-only from auth)
- [x] Program dropdown
- [x] Notes textarea
- [x] File upload block (right column)
- [x] Upload files button
- [x] File list with delete icon
- [x] File types: PDF, JPG, PNG, DOCX
- [x] Max 10 files
- [x] Submit request button (primary)
- [x] Cancel button → Dashboard
- [x] Validations: Student ID required, Program required
- [x] Two-column layout (form left, upload right)
- [ ] Redirect to My Requests detail view (currently redirects to detail)
- [ ] Toast: "Request submitted"

## ✅ My Requests (Student)
- [x] Page title: "My Requests"
- [x] Table columns: Request ID, Program, Status, Last updated, View button
- [x] Status filter dropdown
- [x] Search bar (program or ID)
- [x] Row click → Request Details
- [x] Empty state: "No requests yet" + "Submit Request" button

## ✅ Dashboard (All Roles)
- [x] Student: Submit Request button, Active requests count, Last 5 requests table
- [x] Library/Bursar/Academic: Awaiting review count, Queue link
- [x] Verifier: Pending verification count, In review count, Queue links
- [x] Processor: Ready to process count, Open queue button
- [x] Admin: Total users count, Manage users button

## ⚠️ Verify Requests (Verifier) - NEEDS QUICK FILTERS
- [x] Table columns: Request ID, Student email, Program, Library status, Bursar status, Academic status, Current status, Last updated, View
- [x] Status dropdown filter
- [x] Search bar (email or program)
- [ ] Quick filters: "Needs action", "Hold present" (MISSING)
- [x] Row click → Request Details
- [ ] Batch actions: Approve selected, Mark In Review, Reject selected (MISSING)

## ✅ Request Details (Verifier)
- [x] Request info panel
- [x] Department blocks (read-only) with status + note
- [x] Files list (clickable)
- [x] Verifier notes textarea
- [x] Audit timeline
- [x] Buttons: Mark In Review, Approve, Reject, Save notes, Back
- [x] Rule: Can't approve if dept has Hold/Issue/Owing

## ✅ Library Review Queue
- [x] Table columns: Request ID, Student email, Program, Current status, Library status, Last updated, View
- [x] Filters: Status (Pending/In Review), Search
- [x] Row click → Library Request Details

## ⚠️ Library Request Details - NEEDS WORK
- [x] Library status dropdown (Clear, Hold, Issue)
- [ ] Note textarea required if Hold/Issue (needs proper field)
- [x] Files viewer
- [x] Audit timeline (read-only)
- [x] Save button
- [x] Back to queue button
- [ ] Note storage in database (needs schema update)

## ✅ Bursar Review Queue
- [x] Same structure as Library queue
- [x] Bursar status dropdown (Paid, Owing, Waived, Hold)
- [ ] Note required if Owing/Hold (needs proper field)

## ✅ Academic Review Queue
- [x] Same structure
- [x] Academic status dropdown (Good Standing, Outstanding, Hold)
- [ ] Note required if Outstanding/Hold (needs proper field)

## ✅ Processing Queue (Processor)
- [x] Table columns: Request ID, Student email, Program, Status, Last updated, View
- [x] Filter: Only Approved requests
- [x] Row click → Processor Request Details

## ⚠️ Processor Request Details - NEEDS WORK
- [x] Processor notes textarea
- [x] Upload final transcript button
- [ ] File list for final output files (needs implementation)
- [x] Audit timeline
- [x] Mark Completed button
- [ ] Webhook notification on closure (backend)

## ✅ Student Request Details (Read Only)
- [x] Student info
- [x] Program
- [x] Submitted date
- [x] Current status
- [x] Each department status + note
- [x] Files list
- [x] Audit timeline
- [x] No buttons

## ✅ Admin User Management
- [x] Table: Name, Email, Current role, Role dropdown, Save
- [x] Search bar

## ⚠️ CORE COMPONENTS - NEEDS FIXES

### Audit Timeline
- [x] Format: Date, actor, action
- [ ] Format should be: "Nov 18 2:20 PM — Library — Status: Hold — Reason: Book fee outstanding"
- Current format is close but needs department-specific formatting

### Status Badge Colors
- [x] Pending = gray/warning
- [x] In Review = blue/info
- [x] Approved = green/success
- [x] Rejected = red/danger
- [ ] Completed = purple (needs custom color)
- [x] Hold/Issue/Owing = yellow/orange/warning

### File Panel
- [x] Icon + filename
- [x] Click opens SharePoint link
- [ ] Hover shows file upload date (missing)

