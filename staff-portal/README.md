# Staff Portal integration (feature branch, NOT deployed)

This is a **frontend foundation** only. The `/staff` route must not be released until Worker endpoints, D1, R2, and Sheet sync are implemented and tested.

## Worker API contract

All endpoints are same-origin under `/api/staff`. Set secure HttpOnly SameSite cookies with expiry, apply CSRF/Origin checks on writes, per-IP/user login throttling, and server-side role authorization.

- `POST /api/staff/login` — credentials issued by admin; sets staff session cookie.
- `GET /api/staff/session` — `{authenticated:true,staff:{id,name}}` or `{authenticated:false}`.
- `POST /api/staff/logout` — revokes session.
- `GET /api/staff/config` — `{enquiryUrl,courses:[{id,name}],admissionTerms,scholarshipTerms}`; only active courses.
- `GET /api/staff/dashboard` — `{counts:{enquiries,admissions,scholarships}}` filtered by authenticated staff.
- `POST /api/staff/admission` and `POST /api/staff/scholarship` — multipart application, returns `{number,pdfUrl}` once persisted. Reject invalid fields/files. Infer staff identity from session, never form data.
- Admin-only routes (not yet implemented): staff CRUD / disable / password reset; form field configuration; course logo upload to private R2 and toggle; registration number series; terms; Google Sheets sync configuration; reports / logs and sync retry.

## Data

D1 is the system of record; see `staff-portal/schema.sql`. Store private photos/PDFs in R2 with authenticated or expiring links only. Generate PDFs with academy logo plus optional active course-specific extra logo. Preserve original PDF documents even when settings are subsequently changed.

For Sheets, use the already operating Enquiry Google Form & response Sheet unchanged. A separate existing spreadsheet `Admissions & Scholarships` has tabs `Admissions` and `Scholarships`; the backend must write correctly mapped rows to each tab. Google Apps Script deployment URL and authentication secrets must be configured in Cloudflare Worker secrets, **never in the frontend source**. Use request idempotency and durable retry for failed Sheets updates; avoid duplicate rows. Student Aadhaar and photo links need privacy protections.

## Open dependency

The current GitHub repository is React/Vite and calls external Worker endpoints (e.g. `/api/admin/login`). The Cloudflare Worker API implementation and its deployment settings are not identified in this repository. Obtain the live Worker source/settings before integrating the backend or merging this branch.

Also complete admin management UI, server-sourced dynamic form builder, course-specific logo management and final PDF templates before production.
