# Phase 6 – deployment checklist (not live)

## Current implementation
- Root `worker.ts` routes `/api/staff/*` and `/api/admin/staff/*` to staff-portal/worker-auth.ts, preserving the existing /api/admission and enquiry integrations.
- Existing D1 database has seven staff portal tables. No sample students or staff were inserted.
- Form records can be stored in D1 after routes are deployed, but photo uploads are blocked until private storage is provisioned.
- Sync bridge exists as `worker-sheets.ts` and Apps Script source as `google-apps-script.gs`.

## Google Apps Script manual setup
1. Open your **Admissions & Scholarships** spreadsheet, and make sure it is NOT shared publicly.
2. Extensions → Apps Script, paste the contents of `google-apps-script.gs`. Save.
3. In Apps Script → Project Settings → Script Properties, set:
   - `STAFF_SPREADSHEET_ID` to the ID from the spreadsheet URL
   - `STAFF_SHEETS_SECRET` to a new random, long secret (not the old enquiry secret).
4. **Important: current script requires the first header in row 1 to be `Record ID`.** Its column layout is given by `COLUMNS` in the script. DO NOT overwrite existing columns/data blindly; export/backup first. Test in a copy of the spreadsheet.
5. Deploy → New deployment → Web app. Execution identity should be the spreadsheet owner. Access must permit requests from Cloudflare Worker. The per-request secret checks are an additional control; Google Apps Script web-app URL access is not a private firewall.
6. In Cloudflare Worker secrets/variables set `STAFF_SHEETS_URL` (deployment URL) and `STAFF_SHEETS_SECRET` (matching secret). Never commit secrets to GitHub.
7. Use Admin → Staff Portal Settings → Retry Pending/Failed Sync after verifying end-to-end with non-sensitive sample records. Google Sheet writing is NOT automatic per submission yet; implement a scheduled job or a queue before production.

## Must-fix before live deployment
- Implement login throttling/lockouts and strong password reset procedures.
- Add R2 private photo/PDF upload and generated PDF handling; course-specific active logo configuration.
- Make submissions idempotent across retries; fix registration series numbering with atomic operations and test concurrency.
- Add default/active courses from verified admin course catalog; review currency validation and server-side terms.
- Audit old Admin API authorization (separate from staff module).
- Integrate scheduled/queue Sheet sync with retry controls, test HTTP redirect and permission behavior.
- Run TypeScript build, browser regression tests, and security tests on a staging Worker with test D1/Sheet.
- Never insert real Aadhaar numbers into a test spreadsheet. Limit access to sensitive columns and files.

## Safety
This branch is not deployed. Existing production functionality remains unchanged.
