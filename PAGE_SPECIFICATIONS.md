# TAPS Page Specifications - What Each Area Should Look Like

## 📝 Submit Request (Student)

**Page Title:** Submit Request

**Layout:** Two-column
- **Left Column:** Form
  - Student ID (editable, prefilled if known)
  - Student Email (read-only from auth)
  - Program (dropdown)
  - Notes (textarea)
- **Right Column:** Upload Panel
  - Upload files button
  - File list with delete icon
  - File types: PDF, JPG, PNG, DOCX
  - Max: 10 files

**Buttons:**
- Submit request (primary)
- Cancel (secondary → Dashboard)

**Validations:**
- Student ID required
- Program required
- Notes optional
- 0-10 files allowed

---

## 📊 My Requests (Student)

**Page Title:** My Requests

**Table Columns:**
- Request ID
- Program
- Status
- Last updated
- View button

**Filters:**
- Status filter (dropdown)
- Search bar (search by program or ID)

**Actions:**
- Row click → Request Details
- View button → Request Details

**Empty State:**
- Message: "No requests yet"
- Button: "Submit Request"

---

## 📈 Dashboard (All Roles)

### Student
- Button: Submit Request
- Count: Active requests
- Table: Last 5 requests (ID, program, status, date)

### Library / Bursar / Academic
- Count: Items awaiting your review
- Link: Go to review queue

### Verifier
- Count: Pending verification
- Count: In review
- Links to queues

### Processor
- Count: Ready to process
- Button: Open queue

### Admin
- Count: Total users
- Button: Manage users

---

## 🔍 Verify Requests (Verifier)

**Purpose:** Verifier sees all requests and drives status changes

**Table Columns:**
- Request ID
- Student email
- Program
- Library status
- Bursar status
- Academic status
- Current status
- Last updated
- View

**Filters:**
- Status dropdown: Pending, In Review, Approved, Rejected, Completed
- **Quick filters:** "Needs action", "Hold present"
- Search bar (email or program)

**Actions:**
- Row click → Request Details (Verifier view)
- Batch actions: Approve selected, Mark In Review, Reject selected

---

## 📋 Request Details (Verifier)

**Panels:**
1. **Request Info**
   - Student name/email
   - Student ID
   - Program
   - Submitted date
   - Current status
   - Last updated

2. **Department Blocks (Read Only)**
   - Library status + note
   - Bursar status + note
   - Academic status + note

3. **Files**
   - List file names
   - Click to open

4. **Notes**
   - Verifier notes (textarea)

5. **Audit Timeline**
   - List of events (date, actor, action)

**Buttons:**
- Mark In Review
- Approve
- Reject
- Save notes
- Back to queue

**Rules:**
- If any dept status = Hold or Issue or Owing → cannot Approve
- Changing status writes audit entry

---

## 📚 Library Review Queue (Library)

**Table Columns:**
- Request ID
- Student email
- Program
- Current status
- Library status
- Last updated
- View

**Filters:**
- Status (Pending / In Review)
- Search

**Action:** Row click → Library Request Details

---

## 📋 Library Request Details (Library)

**Fields:**
- Current library status dropdown:
  - Clear
  - Hold
  - Issue
- Note (textarea) **required if Hold or Issue**
- Files viewer
- Audit timeline (read only)

**Buttons:**
- Save
- Back to queue

**Rules:**
- Status change does NOT change main status to Approved
- Verifier finalizes overall approval
- Library only updates libraryStatus column and writes note

---

## 💰 Bursar Review Queue (Bursar)

**Same UI structure as Library queue**

**Bursar Status Options:**
- Paid
- Owing
- Waived
- Hold

**Note:** Required if Owing or Hold

---

## 🎓 Academic Review Queue (Academic)

**Same UI structure**

**Academic Status Options:**
- Good Standing
- Outstanding
- Hold

**Note:** Required if Outstanding or Hold

---

## ⚙️ Processing Queue (Processor)

**Table Columns:**
- Request ID
- Student email
- Program
- Status
- Last updated
- View

**Filter:**
- Only Approved requests

**Action:** Row click → Processor Request Details

---

## 📋 Processor Request Details (Processor)

**Fields:**
- Processor notes (textarea)
- Button: Upload final transcript PDF
- File list: Final output files
- Audit timeline

**Actions:**
- "Mark Completed" button
- Writes audit entry
- Sends webhook to notify closure
- Return to queue

---

## 👤 Student Request Details (Read Only)

**Fields:**
- Student info
- Program
- Submitted date
- Current status
- Each department status + note
- Files list
- Audit timeline

**No buttons**

---

## 👥 Admin User Management

**Table:**
- Name
- Email
- Current role
- Dropdown to change role + save
- Search bar

---

## 🎨 Core Component Behavior

### Audit Timeline Format
**Format:** "Nov 18 2:20 PM — Library — Status: Hold — Reason: Book fee outstanding"

### File Panel
- Show icon + filename
- Click opens SharePoint link
- Hover shows file upload date

### Status Badge Colors
- Pending = gray
- In Review = blue
- Approved = green
- Rejected = red
- Completed = purple
- Hold / Issue / Owing = yellow/orange

