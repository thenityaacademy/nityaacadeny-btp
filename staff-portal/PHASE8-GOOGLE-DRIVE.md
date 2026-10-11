PHASE 8 - GOOGLE DRIVE STAFF PORTAL

Storage account: thenityaacademy@gmail.com
Private root folder ID: 1oAr1zok5DP8hQx_eTshklQVAzfd5l8QQ
Admissions photos: 16cYt2PkbLlGUgOVtTr_WgUWggGN_XWmn
Admissions PDFs: 14camlCdZmGh2OZPxm1h8fA6aGM_xtzZ_
Scholarship photos: 1LBtTOfVaeGtGBRJhV4nOA6sm6gRGAyRP
Scholarship PDFs: 1fxGuq6J9KadsGCPoTEij8aEhGgnWIE9r
Course Logos: 1tHlgQjQ7WvWsRQsSj3FZImsVxxXAzVay
PDF Templates: 1y5MdDQRvjjRvjcw4YmDogv2rrUDHJZll
Main Nitya Academy logo: 1eH75kZyla2u4JOZ-Th3QlMvbidK0KbNW

REQUIRED MANUAL STEP:
1) Open existing Nitya Academy - Staff Portal Google Apps Script project.
2) Replace Code.gs with this GitHub branch's staff-portal/google-apps-script.gs.
3) Save. Do NOT change STAFF_SPREADSHEET_ID or STAFF_SHEETS_SECRET.
4) Deploy > Manage deployments > Edit CURRENT Web App deployment > Version: New version > Deploy.
5) Do NOT create a separate deployment: that changes URL and would require editing STAFF_SHEETS_URL.

CURRENT STATUS:
- Google Drive root and subfolders actually created and private.
- D1 columns for photo_drive_id, pdf_drive_id and extra_logo_drive_id added.
- Backend bridge, PDF creation, Staff-only PDF download, course logo upload and WhatsApp mobile OS file-sharing logic are committed in feature branch.
- Source has not been manually installed into owner's Apps Script deployment or end-to-end tested.
- STAFF_SUBMISSIONS_ENABLED remains off, blocking real student writes.
- Preview Worker and production share D1; do not enable submissions without isolated testing.
- Production is unchanged.

SECURITY:
Student PDFs contain Aadhaar and other personal information. Never share PDFs or folders publicly. WhatsApp desktop flow requires staff to download and attach the PDF. Mobile share sheet may allow sending an actual file; user must confirm Send. Automatic WhatsApp messages require a separate approved Business API.
