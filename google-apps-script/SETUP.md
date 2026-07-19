# Setting up the Cases backend (Google Sheets + Apps Script)

This replaces localStorage for `cases.html`, `rom.html`, and `hrbp.html` with a
real shared backend: one Google Sheet everyone's browser reads/writes to, and
real emails sent via `hamleystraining@gmail.com` when L&D triggers an action
or ROM sends a case to HR.

Do this **while logged into the `hamleystraining@gmail.com` Google account**
(or another account that alias can send from) — emails are sent as whichever
account owns the script.

## 1. Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) → **Blank spreadsheet**.
2. Rename it "Hamleys Mystery Audit — Cases Backend" (top-left).
3. Rename the first tab (bottom-left, double-click "Sheet1") to **`Cases`**.
4. Add a second tab named **`Contacts`** (bottom-left `+`).

### Contacts tab
Add this header row, then one row per ROM plus one HRBP row:

| name | role | email |
|---|---|---|
| Ashlin Moses | ROM | ashlin.moses@hamleys.example |
| Lalit Mohan | ROM | lalit.mohan@hamleys.example |
| Shirish Mastud | ROM | shirish.mastud@hamleys.example |
| *(one row per ROM — name must exactly match the ROM name in Base Store Data)* | | |
| HRBP | HRBP | hrbp@hamleys.example |

The **Cases** tab's header gets created automatically in step 3 below — leave
it blank for now.

## 2. Create the Apps Script project

1. In the Sheet: **Extensions → Apps Script**.
2. Delete the placeholder `Code.gs` content, and paste in the entire contents
   of `google-apps-script/Code.gs` from this repo.
3. At the top of the script, replace:
   ```js
   const SHEET_ID = "PASTE_YOUR_GOOGLE_SHEET_ID_HERE";
   ```
   with your Sheet's ID — the long string in its URL:
   `https://docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`
4. Check `DASHBOARD_BASE_URL` matches your live GitHub Pages URL (it should
   already be correct: `https://hamleystraining-dashboard.github.io/hamleys-mystery-audit/`).
5. Save (Ctrl+S / Cmd+S). Name the project "Hamleys Cases Backend" if asked.

## 3. Create the Cases tab header row

1. In the Apps Script editor, use the function dropdown at the top (next to
   the "Debug" button) and select **`setupCasesSheetHeader`**.
2. Click **Run** (▶). The first time, it'll ask you to authorize — click
   through **Review permissions → (choose your account) → Advanced → Go to
   Hamleys Cases Backend (unsafe) → Allow**. This warning is normal for
   scripts you wrote yourself; it's not actually unsafe.
3. Go back to the Sheet — the **Cases** tab should now have a header row
   (key, vertical, evalId, storeCode, storeName, unmapped, rom, sd, rm, date,
   score, stage, triggerReason, employeesJSON, historyJSON, updatedAt).

## 4. Deploy as a Web App

1. Back in Apps Script: **Deploy → New deployment**.
2. Click the gear icon next to "Select type" → **Web app**.
3. Fill in:
   - Description: `Cases backend v1`
   - Execute as: **Me (hamleystraining@gmail.com)**
   - Who has access: **Anyone** (required — GitHub Pages is a different
     origin, so it can't be restricted to "Anyone within Hamleys" unless
     your Google Workspace supports that; if it does, that's more secure and
     worth using instead)
4. Click **Deploy**. Authorize again if prompted.
5. Copy the **Web app URL** it gives you — looks like
   `https://script.google.com/macros/s/AKfycb.../exec`. You'll need this next.

**Whenever you edit Code.gs later:** you must **Deploy → Manage deployments →
edit (pencil icon) → New version → Deploy** for changes to take effect — just
saving the script does not update the live Web App.

## 5. Point the dashboard at it

1. Open `assets/js/config.js` in this repo.
2. Paste your Web App URL:
   ```js
   const HMAI_CASES_API = "https://script.google.com/macros/s/AKfycb.../exec";
   ```
3. Commit and push. `cases.html`, `rom.html`, and `hrbp.html` will now read
   and write through this URL instead of local browser storage — every
   user sees the same live case list, and triggering an action or sending
   to HR sends a real email.

Leave `HMAI_CASES_API` as an empty string (`""`) to fall back to the old
local-storage-only mode (useful for testing UI changes without touching
the real Sheet/emails).

## 6. Test it

1. Open `cases.html`, trigger an action on a test case, pick a reason.
2. Check the ROM's email arrives (the address from your Contacts tab).
3. Open `rom.html`, add a test employee, **Send to HR** — check the HRBP
   email arrives.
4. Open `hrbp.html`, close that employee's action — confirm the case flips
   to "Closed" and shows correctly on the Overview tracker.
5. **Before going live for real**, clear your test data: open the Google
   Sheet's **Cases** tab and delete every row except the header. The next
   page load will re-flag genuine below-80 stores fresh, with clean history.

## Notes & limits

- **Sending limit:** a personal Gmail account can send up to 100 emails/day
  via `MailApp`. If Hamleys' mystery-audit volume ever exceeds that, a Google
  Workspace account raises this to 1,500/day.
- **"Anyone" access** on the Web App means anyone with the URL can call it —
  it's an unlisted URL (not linked anywhere public), similar in spirit to the
  password gate on the HTML pages, but same caveat: this is a deterrent, not
  authentication. It's the standard tradeoff for a no-cost Apps Script setup;
  a paid backend with real per-user auth is the eventual upgrade path if this
  matters more later.
- **If an email doesn't send:** check the Contacts tab for that ROM's exact
  name match, and check Apps Script's **Executions** log (left sidebar) for
  errors.
