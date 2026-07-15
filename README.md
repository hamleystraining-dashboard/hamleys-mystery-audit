# Hamleys Mystery Audit Leadership Dashboard — V1

Static GitHub Pages prototype for Mystery Audit performance and disciplinary action tracking.

## Files
- `index.html` — Leadership Dashboard
- `admin.html` — Base Store Data and Mystery Audit PDF upload
- `defaulters.html` — ROM defaulter submission
- `hr-action.html` — HR action queue
- `style.css`, `app.js`, `seed-data.js` — shared assets/data

## V1.1 scope
- Country landing page with nationwide average and all 7 section reflections
- Left-side RM / ROM / SD / Store navigation
- Date range and section filters inside each hierarchy tab
- Independent incompatible hierarchy filters removed to prevent false mapping combinations
- Audit trend and section performance
- Latest Areas of Improvement remarks
- Store hierarchy from Base Store Data
- Bulk PDF parsing with review before import
- ROM defaulter case creation
- HR action recording
- Action closure reflected on dashboard

## Important V1 limitation
V1 uses browser `localStorage`. Data is shared between pages **only in the same browser/device**. It is not yet a multi-user database. Email notifications are not enabled.

The next phase should connect the pages to Google Sheets + Google Apps Script (or another backend) for shared data, authentication and HRBP email notifications.

## Publish on GitHub Pages
1. Create a new GitHub repository, e.g. `hamleys-mystery-audit`.
2. Extract this ZIP.
3. Upload **all files from the extracted folder to the repository root**. `index.html` must be at the root.
4. Commit the files to the `main` branch.
5. Open repository **Settings → Pages**.
6. Under **Build and deployment**, choose **Deploy from a branch**.
7. Select branch `main` and folder `/ (root)`.
8. Click **Save**.
9. Wait for GitHub Pages to publish the site. GitHub will show the published site address in the Pages section.

## Admin upload format
Base Store Excel must contain these exact headers:
`Store Name`, `Store Code`, `ROM Name`, `SD Name`, `RM Name`

## Libraries
The prototype loads Chart.js, SheetJS and PDF.js from public CDNs. An internet connection is required for these libraries.


## V1.1 mapping correction
The earlier dashboard used independent ROM, RM, SD and Store dropdowns. This allowed impossible combinations to be selected simultaneously (for example a North ROM with a Bengaluru store), producing zero-result views and the appearance of incorrect mapping. V1.1 uses one hierarchy dimension at a time and always derives audit membership from the Store Code mapping in Base Store Data.
