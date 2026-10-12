# Nitya Academy Staff Portal — Live readiness checklist

Production configuration supplied by institute (12 October 2026):

- Scholarship: prefix `NAECCE`, issue numbers `2601001`–`2605000`.
- Admission: prefix `NA-2026-`, issue 4-digit `0001`–`5000`.
- Registration fees: ECCE Scholarship ₹100, **record only**, Cash/Online. No online payment collection or payment verification.
- Daily enquiry: https://docs.google.com/forms/d/e/1FAIpQLSfF9DJ9QMfzqFeB6LKYBT62-rPcwo8cCahNyZFW0oHDrYpLoA/viewform?usp=header
- Terms: editable by Admin under Staff Portal Settings, initially institute-supplied English declaration.
- WhatsApp: English student confirmation, manual final Send. PDF share on supported mobile devices, manual attach elsewhere.

## Conditions before enabling real submissions

1. Google Apps Script V4 deployed on existing Web App URL; `getPdf`, `finalizeStudentDocuments`, `verifyStudentPdfV4` actions match.
2. Run Admin `Test Admission + Scholarship PDF (synthetic)` and confirm success in *both* private Drive PDF folders.
3. Test one synthetic admission and one synthetic scholarship in **isolated D1 preview**, with clearly marked test IDs; verify correct issued numbers, Photo rename, PDF content, Google Sheet row mapping and successful retry behavior. Remove test Sheet rows.
4. Verify staff access isolation, invalid Aadhaar/phone protection, duplicate submission protection, mobile WhatsApp text and PDF sharing.
5. Production `STAFF_SHEETS_URL` and `STAFF_SHEETS_SECRET` are present. Verify Google Apps Script response with the Admin PDF smoke test; protect Drive privacy and never reveal secrets in code or logs.
6. Create a fresh D1 rollback bookmark; check existing 1 staff account, public Website courses, Study Material, News, Site Settings.
7. Set `STAFF_PHOTO_UPLOADS_ENABLED=true` and `STAFF_SUBMISSIONS_ENABLED=true` **only after** passing all tests.
8. No autonomous WhatsApp sending; the staff confirms and presses Send.

Both final submission and photo uploads are intentionally disabled in Production until confirmed by tests.

## Deployment reliability

Cloudflare can return intermittent HTTP 504 from Worker `services` or `secrets` APIs during Wrangler deploy. If a build succeeds but the deployment step reports 504, the GitHub commit is **not necessarily live**. Check Worker Deployment version and only assert success after confirmed Cloudflare deployment; never bypass the fail-closed submission flags.
