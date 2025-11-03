# Data Import Instructions

## Overview
This script imports transcript request data from a tab-separated file into the TAPS database.

## Data Format
The import script expects a tab-separated values (TSV) file with:
- First row: Column headers
- Subsequent rows: Data rows

## Required Fields (with defaults for missing values)

The import script will automatically create missing fields:

- **Student ID**: Uses `Request ID` if `Student ID` is missing, or generates one
- **Student Email**: Creates default email if missing
- **Student Name**: Extracts from `Requestor` field or email
- **Program**: Uses `Degree to be Awarded` or defaults to "General Studies"
- **Request Date**: Parses from `Date of Request` or `Created` field
- **Status**: Maps from old status to new enum values
- **Department Statuses**: Maps Library, Bursar, and Academic statuses
- **Notes**: Cleans HTML and extracts from comments fields
- **Dates**: Handles MM/DD/YYYY format automatically

## Status Mappings

### Overall Status
- `New` → `PENDING`
- `In progress` → `IN_REVIEW`
- `Completed` → `COMPLETED`
- `Cancelled` → `REJECTED`
- `Approved` → `APPROVED`

### Library Status
- `Approved` → `Clear`
- `Awaiting Payment` → `Hold`
- Other values preserved as-is

### Bursar Status
- `Approved` → `Paid`
- `0.00 Balance` → `Paid`
- `Eligible for Refund` → `Paid`
- `Awaiting Payment` → `Owing`
- Other values preserved

### Academic Status
- `Completed` → `Good Standing`
- `In complete` / `Incomplete` → `Outstanding`
- Default: `PENDING`

## Usage

1. **Save your data to a TSV file:**
   ```bash
   # Copy your data and save as data/transcript-requests.tsv
   # Make sure it's tab-separated (not spaces)
   ```

2. **Run the import:**
   ```bash
   cd backend
   npm run import:data ../data/transcript-requests.tsv
   ```

3. **Check the results:**
   - The script will show progress every 50 rows
   - Summary includes: total rows, success count, error count
   - Errors are logged with row numbers

## Field Mapping

| Source Field | Database Field | Notes |
|-------------|---------------|-------|
| Student ID | studentId | Required |
| Email Address | studentEmail | Required |
| Requestor | User name | Creates user if needed |
| Date of Request | requestDate | Parsed date |
| Status | status | Mapped enum |
| Library Dept Status | libraryStatus | Mapped |
| Library Dept Comments | libraryNote | HTML cleaned |
| Office of Bursar Status | bursarStatus | Mapped |
| Office of Bursar Comments | bursarNote | HTML cleaned |
| Academic History | academicStatus | Mapped |
| Academic Verifier Comments | academicNote, verifierNotes | HTML cleaned |
| Degree to be Awarded | program | Defaults if missing |
| Conversations | AuditLog entries | Parsed and created |
| Modified | lastUpdated | Parsed date |

## Handling Missing Fields

The script automatically handles:
- ✅ Missing Student ID → Generates unique ID
- ✅ Missing Email → Creates default email
- ✅ Missing Program → Defaults to "General Studies"
- ✅ Missing Dates → Uses current date
- ✅ Missing Status → Defaults to PENDING
- ✅ Missing Notes → Sets to null
- ✅ HTML in Comments → Cleaned and preserved
- ✅ Empty Cells → Set to null or default value

## Example

```bash
# 1. Ensure your .env has DATABASE_URL set
# 2. Make sure database migrations are run
npm run db:migrate

# 3. Run the import
npm run import:data ../data/transcript-requests.tsv
```

## Troubleshooting

**Error: "File not found"**
- Check the file path is correct
- Use relative path from backend directory

**Error: "Database connection failed"**
- Check DATABASE_URL in .env
- Ensure database is running

**Errors during import:**
- Check the error messages for specific row issues
- Common issues: invalid dates, duplicate emails (which are handled)

**Missing users:**
- Users are auto-created from email addresses
- Default role is STUDENT
- Staff mentioned in conversations get VERIFIER role

## Post-Import

After import, you can:
1. Check data in Prisma Studio: `npm run db:studio`
2. Verify counts: Check database directly
3. Test in the application UI


