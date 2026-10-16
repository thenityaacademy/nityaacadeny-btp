# Nitya Academy A4 Word-Style Staff PDF — V6

## User-approved layout
The uploaded NITYA ACADEMY(1).docx (one-page A4) is the reference for Admission and ECCE Scholarship registration PDFs. Use the institute logo on the left; approved optional course logo on the right; student photo; bold NITYA ACADEMY/phone/address header; registration number/date; black-outline tables; personal/contact/qualification/course/payment/declaration sections; signature. Text/tables/outlines black; logos and student photo retain their color.

The old 41–46-page PDF layout had an actual root cause: `Paragraph.setLineSpacing(100)` and `setLineSpacing(110)` used a *line count*, not percentage. V6 uses `1.0` and A4 portrait 595.28 × 841.89pt, compact fonts and table rows. PDF export retries at scales 1.00, 0.86, and 0.72 if the PDF has multiple Page objects. No 40+ page output is saved to private student folders.

## Code (already prepared in GitHub)
`staff-portal/google-apps-script-finalize-v6-a4-word.gs`

All existing V5 functions are preserved in this full-file replacement, including `finalizeStudentDocuments_`, `reviseStudentDocuments_`, `getStudentPdfV4_` and `verifyStudentPdfV4_`. Only the PDF construction routine and its helper methods were changed.

## Google Apps Script: one necessary owner-only deployment step
The Apps Script editor is not exposed through current connected account actions. Do NOT claim it has been published until the owner performs the following operation.

1. Open the existing **Nitya Academy – Staff Portal** Apps Script project.
2. Back up the existing `PhotoDraft.gs`. Replace its **entire contents** with the GitHub V6 source above. Do not add a second copy of `buildStaffPdf_` or overwrite `Code.gs`.
3. In existing `Code.gs` → `doPost(e)` → `switch(payload.action)`, add ONE new case before `default:`:

```javascript
case "staffPdfV6Ready":
  result={success:true,code:"STAFF_PDF_V6_READY"};
  break;
```

Keep all old cases, especially `finalizeStudentDocuments`, `reviseStudentDocuments`, `staffPdfV5Ready`, `getPdf`, `upsert` and photo handlers. Do not alter Script Properties, Web App URL, shared secret, Google Sheet ID, or folder permissions.

4. **Save**. Select `testStaffPdfV6` from the function dropdown, then **Run**. It creates only synthetic PDFs in the existing PRIVATE Admission and Scholarship folders, then trashes them automatically. Ensure `Execution completed` with no exception.
5. **Deploy → Manage deployments → edit existing Web App → Version: New version → Deploy**. Do not create a new Web App URL.

The Website backend's new `Rebuild A4 PDF` button checks `STAFF_PDF_V6_READY` BEFORE any change to D1; with old Apps Script the button safely refuses. After V6 deployment, it rebuilds an older PDF privately using the SAME registered number and updates the original Google Sheet entry's PDF reference (sheet status is made pending until synced).

## Preview/production QA
- Local render of two sample Word templates: 1 A4 page each. Inspect `Nitya_Academy_A4_Admission_Scholarship_Design_Preview.pdf` (contains **synthetic data only**).
- Cloudflare Build must pass. No routing, login, D1 schema, serial sequences, staff secret, Google Sheet IDs, or form validation changed.
- PDF page count can only be confirmed after running owner Apps Script V6 with Google's exporter. The local Word render does not prove Google Apps Script output will be one-page.
- Always verify original `My Submitted Forms` number is unchanged after a rebuild.
- Rollback to previous GitHub main or backup branch `backup/pre-pdf-a4-word-v6-2026-10-16` without dropping data.
