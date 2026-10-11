# Phase 7 — PDF/Photo Storage & Course Logo Readiness

**Code exists on the feature branch, NOT deployed to production.**

Cloudflare account R2 API currently responds `10042: Please enable R2 through the Cloudflare Dashboard`. R2 billing/enablement requires the account owner's explicit action. Do **not** enable R2 or commit secrets automatically.

## Required Owner Action
1. Cloudflare Dashboard → R2 Object Storage → enable the service; review any billing/payment prompt before accepting.
2. Create a **PRIVATE** R2 bucket, suggested name `nitya-academy-staff-private`; do not enable public development URLs or custom domains.
3. Attach bucket binding `STAFF_FILES` to the staff Worker **preview/staging** environment first. When active in deployment configuration, the proposed entry is:

```json
"r2_buckets": [{
  "binding": "STAFF_FILES",
  "bucket_name": "nitya-academy-staff-private"
}]
```

4. Never copy live Aadhaar/photos into an unrestricted staging app; use a separate staging bucket and D1 database before write tests.
5. Do **not** set `STAFF_SUBMISSIONS_ENABLED=true` until PDF generation, persistent download flow and WhatsApp workflow are implemented and security-tested.

## Implemented in this branch
- Admin: course-specific Extra Logo upload/replace/delete + separate logo Active/Inactive control.
- Extra logos use private R2 keys; academy logo remains in the PDF plan.
- Server-side MIME signature checks for PNG/JPG/WEBP logo files, max 2MB.
- Student-photo private storage code, max 5MB, checked for file signature.
- Applications return 503 and **are not submitted** unless STAFF_SUBMISSIONS_ENABLED=true and STAFF_FILES is bound.
- Staff forms receive readiness flags; submit button stays disabled pending configuration.
- Existing public enquiry flow and website admission remain unchanged.

## Not Yet Implemented (must complete)
- Server-side A4 PDF generator, safely embedding academy logo, optional Active course logo and student photo.
- Persist PDF files in R2 and `pdf_r2_key` in D1.
- Authenticated or short-lived document delivery endpoint; no public URLs for sensitive forms.
- Mobile Share API option for attaching the actual PDF and a WhatsApp prefilled message with user-controlled send.
- Automatic or scheduled Apps Script sync after forms; only manual retry module exists currently.
- Dynamic terms/fields settings, privacy notice, staff security hardening and backups.
- Full staging tests for no-duplicate submissions/registration sequences, R2 errors, mobile UI, PDF download/WhatsApp, Sheet column mapping.

**Never deploy the latest preview as Production just because it has a green Ready status.**
