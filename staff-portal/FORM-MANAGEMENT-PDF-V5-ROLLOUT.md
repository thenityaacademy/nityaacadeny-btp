# Urgent PDF V5.1 correction (2026-10-13)

**The former V5 code had a verified 46-page Admission / 41-page Scholarship
pagination bug.** `Paragraph.setLineSpacing(100)` and `(110)` meant 100 and
110 *lines*, not percent. Google Apps Script's DocumentApp uses line multipliers.
The current `staff-portal/google-apps-script-finalize-v5.gs` in **main** after
the V5.1 release uses `setLineSpacing(1.0)` and `setLineSpacing(1.1)`.
DO NOT redeploy an earlier copy of PhotoDraft.gs.

### One owner-only Apps Script update (same existing Web App)

1. Backup `PhotoDraft.gs`. Replace its contents with the complete latest
   `staff-portal/google-apps-script-finalize-v5.gs` file from GitHub **main**.
2. In `Code.gs`, find the EXISTING `case "staffPdfV5Ready":` and modify
   ONLY its return marker:
   `result={success:true,code:"STAFF_PDF_V5_1_READY"};`
   Do not add a duplicate case. Do not edit existing spreadsheet ID or secrets.
3. Save. Select `testStaffPdfV5` and Run. Confirm no error.
4. **Deploy > Manage deployments > Edit existing Web App > New version > Deploy**;
   DO NOT create a new URL or new deployment.
5. In Live Staff Portal > My Submitted Forms, each 41/46-page old form has
   **Rebuild Compact PDF**. Click once per existing form AFTER Apps Script
   V5.1 is deployed. The Registration Number stays unchanged, old private PDF
   moves to Trash, and the new PDF is held privately in the same folder.
6. Download the rebuilt Admission AND Scholarship forms and confirm actual
   page count; expected approximately 1-2 pages, but verify before declaring
   done. If unexpectedly long, stop submitting new forms and report the page
   count. No need to create a second registration number.

### WhatsApp PDF + English message

The plain `wa.me` link can only prefill text. New Staff UI offers
`Prepare PDF + Message Share` followed by `Share PDF + English Message`
through the native Web Share API on browsers that support `navigator.canShare`
with PDF files. Choose WhatsApp and the appropriate recipient **manually**.
Some mobile WhatsApp versions ignore a shared text caption when a file is
included; confirm the text and attachment in WhatsApp before pressing Send.
On desktop or unsupported mobile, download the PDF and attach it to the
prepared WhatsApp message. Automatic, server-originated PDF delivery needs
separate WhatsApp Business Platform API setup and recipient opt-in.

---

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
