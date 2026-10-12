# Nitya Academy — Private Staff Student Photo (Step 1)

## Scope

- Staff Admission/Scholarship form: JPG or PNG selection and **local** image preview.
- Actual upload only when `STAFF_PHOTO_UPLOADS_ENABLED=true` and V3 Google Apps Script is installed.
- Upload protected by active Staff session and same-origin POST.
- Server validates **JPEG/PNG signatures, dimensions, maximum 2.5 MB, student/guardian consent**.
- Photos go only to existing **private** Google Drive folders `DRIVE_FOLDERS.admissions.photos` and `DRIVE_FOLDERS.scholarships.photos`.
- D1 only stores Staff ID, kind, opaque photo UUID, private Drive ID, MIME, size, state and expiry; **no student Aadhaar, name or image bytes**.
- Remove action only works for the uploading Staff. The file is moved to Drive Trash.
- Expiry: 48 hours. A guarded Worker Cron trigger cleans up to 20 expired drafts nightly (only when photo feature is activated).
- **Admission/Scholarship final Submit, PDFs, Sheet sync and WhatsApp remain DISABLED.** Uploading a photo is not submitting a form. Never test with a real student until the entire workflow is approved.

## Deployment sequence (no changes to live student records)

1. Verify Preview build on branch `release/staff-photo-drive-private`, bound to `nitya-academy-staff-test-db`.
2. Preview D1 migration `staff-portal/phase-photo-migration.sql` is additive and has been applied only on test DB.
3. Update *existing* Apps Script `Nitya Academy - Staff Portal` V2:
   - Add a new Apps Script file named `PhotoDraft.gs` and paste contents of `staff-portal/google-apps-script-photo-addon.gs`.
   - In existing `Code.gs` `doPost(e)` switch, add four cases **before** `default`:

```javascript
case "uploadStudentPhoto":result=uploadStudentPhoto_(payload);break;
case "getStudentPhoto":result=getStudentPhoto_(payload);break;
case "deleteStudentPhoto":result=deleteStudentPhoto_(payload);break;
case "verifyStudentPhoto":result=verifyStudentPhotoBridge_();break;
```

4. Save Apps Script. Select `authorizeStudentPhotoFolders` from function selector and Run once to confirm both private photo folders. The synthetic test images are trashed.
5. **Deploy → Manage deployments → Edit pencil → Version: New version → Deploy** the same existing Web App. Keep **Execute as Me** and the same existing URL. Do not expose folders or change script secrets.
6. Open **Admin → Staff Portal Settings → Student Photo Storage → Test Private Photo Drive** on isolated Preview. Expect `STUDENT_PHOTO_V3_READY`.
7. Set Preview `STAFF_PHOTO_UPLOADS_ENABLED=true` only after verification; keep Production flag unset or `false`.
8. Test under test Staff ID using a **synthetic** JPG/PNG >=32×32 pixels, under 2.5 MB. Verify upload, status, delete, unauthorized access denial, invalid images blocked, independent Admission/Scholarship folders and cleanup. No actual student data.
9. Apply additive D1 migration on Production **only after all Preview tests pass**; verify backup bookmark. Enable Production `STAFF_PHOTO_UPLOADS_ENABLED=true` only after Google Apps Script V3, permission check, migration and security tests are confirmed.
10. Verify new Worker version and rollback readiness. Production photo drafts must be deleted or linked to final submitted forms within 48 hours (form submission remains a separate phase).

## Rollback

- Previous production Worker version (as of start of this step): `03d35769-43ab-4955-897f-529adcdb4b0c`.
- Code backup: `backup/pre-staff-photo-2026-10-12`.
- Disabling `STAFF_PHOTO_UPLOADS_ENABLED` immediately stops new uploads. Existing private draft files can still be cleaned by scheduled/manual cleanup after reactivation; never restore Production D1 indiscriminately.
- Previous Apps Script deployment version can be reselected in Manage deployments if necessary.

## Safety constraints

Never post secrets, student Aadhaar or identifiable photos in issues, logs or test files. Do not share any private Drive folder with 'Anyone with the link'. Restrict Apps Script URL by shared secret and validate the file's folder on every read or delete. Do not expose file IDs to Staff clients; the Worker returns only a random draft ID.
