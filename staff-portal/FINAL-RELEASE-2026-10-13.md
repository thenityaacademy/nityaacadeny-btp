# Nitya Academy Staff Portal — Final clean reset and A4 PDF changes (13 Oct 2026)

## Source changes saved in GitHub main
- Admissions and ECCE Scholarships now have independent Staff Portal navigation: New Form and Records per category.
- Staff records API filters by `kind` and staff owner.
- Removed the visible **Rebuild Compact PDF** control.
- PDF generator source `staff-portal/google-apps-script-finalize-v5.gs` now uses a compact A4 design with black/white text/tables, Academy logo top LEFT, optionally enabled uploaded course logo top RIGHT, same maximum 68pt x 68pt logo box, and student photo in header. No extra "COURSE RECOGNITION / PROGRAMME LOGO" line.
- No new logos, seals, or affiliation claims are generated. Course logos are still controlled per course from Admin.

## Existing test data already cleared
- Production D1: removed 2 admission + 2 scholarship Staff Portal test records.
- Preview D1: removed 3 admission + 2 scholarship Staff Portal test records and one orphan draft.
- Reset LIVE admission next number to `NA-2026-0001` and LIVE ECCE scholarship to `NAECCE2601001`.
- Reset PREVIEW to `TEST-NA-2026-0001` / `TESTECCE-1`.
- Cleared all test form rows from ONLY the `Admissions` and `Scholarships` tabs of the `Admissions & Scholarships` spreadsheet (headers retained).
- Deleted related test PDFs and student photos from the four private Admissions/Scholarships document folders.
- Staff accounts, public website admission/enquiry data, existing course logos and settings were not wiped.
- Verified both D1 Staff applicant counts are 0 and affected four Drive folders are empty.

## RELEASE STEPS STILL REQUIRED
The repository is not connected to an automatic Cloudflare Workers build trigger. The connected Worker deployment history shows Wrangler-sourced uploads.

1. From a current checkout of GitHub main, build and upload the website:
   ```bash
   npm install
   npm run build
   npx wrangler deploy
   ```
   Confirm the deployed Staff Portal has separate Admissions/Scholarships areas and no Rebuild Compact PDF button.
2. The PDF generator executes in a **different Google Apps Script Web App**, not from the Worker repository. In existing `Nitya Academy - Staff Portal` Apps Script, back up existing `PhotoDraft.gs`, replace that file's content with the complete NEW `staff-portal/google-apps-script-finalize-v5.gs` source from GitHub main. Do not add a second file with duplicate function names. Do not replace or remove `Code.gs` or secrets.
3. Keep the existing `Code.gs` action cases: `finalizeStudentDocuments`, `reviseStudentDocuments`, `getPdf`, and `staffPdfV5Ready` (returning `STAFF_PDF_V5_1_READY`). Then run `testStaffPdfV5` inside Apps Script and deploy via **Deploy → Manage deployments → Edit current web app → New version → Deploy**. Keep the same Web App URL.
4. Generate **one synthetic Admission and one synthetic ECCE Scholarship** form with representative full fields and the actual optional ECCE course logo active; download both. Confirm exactly **1 A4 page** each, black/white except actual logos/photo, two prominent logos top left/right of matching box size, legible student photo and all fields. Stop if they spill over: do not assume source code guarantees page count for extraordinary-length entries.
5. If Apps Script code is not updated, the previous PDF styling will remain live even when the Worker is deployed. Conversely, without a Worker deploy, the previous combined Staff dashboard can remain live.

## Reminder
Deleted registration numbers from the sandbox/test-run period have deliberately been reused after wiping corresponding Staff Portal test records and Sheet/PDF copies, per explicit owner request. Do not perform such a reset once genuine student applications have been issued.
