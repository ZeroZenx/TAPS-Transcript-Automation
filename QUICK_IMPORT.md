# Quick Data Import Guide

## Step 1: Save Your Data

Copy your tab-separated data and save it to `data/transcript-requests.tsv`

**OR** use the helper script:
```bash
./scripts/save-import-data.sh
# Then paste your data and press Ctrl+D
```

## Step 2: Run the Import

```bash
cd backend
npm run import:data ../data/transcript-requests.tsv
```

## What Gets Imported

✅ **All Required Fields** (with smart defaults):
- Student ID, Email, Name → Creates users automatically
- Program → Extracted or defaults to "General Studies"
- Request Date → Parsed from various date fields
- Status → Mapped to new enum values

✅ **Department Statuses**:
- Library Status → Mapped (Approved→Clear, Awaiting Payment→Hold)
- Bursar Status → Mapped (Approved→Paid, Awaiting Payment→Owing)
- Academic Status → Mapped (Completed→Good Standing, Incomplete→Outstanding)

✅ **Notes & Comments**:
- Library Comments → Cleaned HTML, saved to `libraryNote`
- Bursar Comments → Cleaned HTML, saved to `bursarNote`
- Academic Comments → Cleaned HTML, saved to `academicNote` and `verifierNotes`
- Conversations → Parsed into AuditLog entries

✅ **Missing Fields Handled**:
- Missing Student ID → Auto-generated
- Missing Email → Default email created
- Missing Program → "General Studies"
- Missing Dates → Current date
- Missing Status → "PENDING"
- Empty cells → Set to null

## Status Mappings

| Old Status | New Status |
|------------|------------|
| New | PENDING |
| In progress | IN_REVIEW |
| Completed | COMPLETED |
| Cancelled | REJECTED |
| Approved | APPROVED |

## After Import

Check your data:
```bash
npm run db:studio
```

Then test in the web application!


