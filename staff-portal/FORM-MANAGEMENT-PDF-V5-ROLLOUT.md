# Nitya Academy — Staff Form Management & Professional PDF V5

## What changes

1. Both Admission and ECCE Scholarship PDF use one formal university-style layout: approved institute logo, real student photo, registration strip, structured personal/address/qualification/fees tables, editable Terms and signature panels. No unapproved affiliations, false seals or logos.
2. Admin can **advance** Next Number and increase Last Number independently per series. Prefix and already-issued numbers are not changed; skipped values can never be reused.
3. Staff sees **Edit Form** to correct a recorded application's details with the SAME original number. Requires deployed Apps Script V5; the API checks bridge readiness BEFORE writing D1 changes.
4. Staff sees **Remove from Staff List**, **Removed Forms** and **Restore**. This is a soft removal. It does not delete Google Sheets/Drive files or reuse a serial; audit events are stored.
5. Edited forms regenerate a new PRIVATE PDF with **Corrected-<revision>** filename and upsert the existing Google Sheet row by application/registration number. Failed PDF or Sheets processing can be retried from the Staff dashboard; the old PDF is not served as a corrected one.

## One-time Google Apps Script owner action (needed for professional PDFs + Edit Form)

Google Apps Script project: **Nitya Academy - Staff Portal**, use the *existing* Web App deployment and Google account that owns the private Drive folders.

1. In Apps Script open **PhotoDraft.gs**, save a text backup locally, then **replace its complete code** with `staff-portal/google-apps-script-finalize-v5.gs`. Don't create a parallel .gs file with duplicate function names.
2. Open **Code.gs**; within the existing `switch(payload.action)` in `doPost(e)` add these **two** cases **before** `default:`:

```javascript
case "reviseStudentDocuments":result=reviseStudentDocuments_(payload);break;
case "staffPdfV5Ready":result={success:true,code:"STAFF_PDF_V5_READY"};break;
```

Keep all other existing cases unchanged, including `finalizeStudentDocuments`, `verifyStudentPdfV4`, `getPdf` (its V4 function), `upsert`, photo handlers and course-logo handlers. Preserve the previously optimized `DRIVE_FOLDERS.mainLogo` in Code.gs.

3. Click **Save**. Choose `testStaffPdfV5` from the Apps Script function dropdown and **Run**. It creates a fake Admission and fake Scholarship PDF then puts both in Trash; it never uses a real student.
4. Only after `Execution completed` (no Error): **Deploy → Manage deployments → Edit existing Web App → Version: New version → Deploy**. **Do not create a new Web App URL**.
5. Admin → Staff Portal Settings → **Test Admission + Scholarship PDF (synthetic)** should show green Success. Existing Apps Script Script Properties and Cloudflare bindings require NO changes.

The new PDF template is used for forms generated AFTER deployment. The original PDF for an existing form remains private until you explicitly edit and save that form; then V5 generates a corrected PDF and updates that same Google Sheet row.

## Testing, rollback, and privacy

- Use only synthetic student data in Preview; its D1 is isolated from Production.
- Additive D1 schema file: `staff-portal/phase-form-management-migration.sql`. Do not drop or overwrite any D1 records.
- `staff_form_audit` records actor, form and timestamp, not full Aadhaar copies.
- Existing registration numbers remain unique even when a form is removed from Staff List.
- Download uses same-origin authenticated POST (no public Drive links).
- Google Sheets `upsert` is keyed by the original number; the same row is updated, not appended, when available.
- Reverting this release's GitHub code and redeploying does not roll back form records.
