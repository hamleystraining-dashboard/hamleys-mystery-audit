# Hamleys Mystery Audit Intelligence

A Mystery Audit dashboard for Hamleys India — built as a static site
(vanilla HTML/CSS/JS, no chart library dependency) so the public dashboard
can be published free on GitHub Pages.

```
├── index.html      Overview — India avg, section scores, regional leaderboard, action tracker
├── cohort.html      Store Cohort — RM/ROM/SD/store/date/score filters, latest 10 audits
├── trend.html        Trend Data — last-5-audit trend + strengths/weaknesses per store
├── admin.html         Standalone, password-gated — L&D data uploads (not in the public nav)
├── cases.html          Standalone, password-gated — L&D: trigger a case, pick the reason
├── rom.html             Standalone, password-gated — ROM: add defaulters + action, send to HR
├── hrbp.html             Standalone, password-gated — HRBP: close each employee's action
├── assets/
│   ├── css/style.css
│   ├── js/data.js     data loading, filtering, cases, leaderboard & SWOT logic
│   ├── js/ui.js        sidebar / standalone header + shared widgets
│   ├── js/auth.js       shared password gate for admin/cases/rom/hrbp
│   └── data/           stores.json, retail_audits.json, play_audits.json (your real data)
```

**Important — run this via a local web server, never by double-clicking the HTML file.**
Opening any page as a `file://` address (double-clicking it, or dragging it into the
browser) blocks the dashboard from loading its JSON data — that's a browser security
restriction, not a bug, and it's what causes a "0 stores / 0 audits loaded" screen with
no buttons anywhere. Two ways to view it correctly:
- **Locally:** from the repo folder run `python -m http.server 8000` and open
  `http://localhost:8000/` — not the `file://` path.
- **On GitHub Pages** (below): not an issue at all, Pages always serves over `https://`.

## 1. Publishing to GitHub Pages

1. Create a new GitHub repo, e.g. `hamleys-mystery-audit`.
2. Push everything in this folder to the repo root (`main` branch).
3. In the repo: **Settings → Pages → Source → Deploy from branch → main / (root)**.
4. Your dashboard goes live at `https://<your-org>.github.io/hamleys-mystery-audit/`.
5. All five HTML files are technically reachable once published — GitHub Pages has
   no concept of "private" files within a public repo. The distinction that matters
   is which **links** you hand out, not which files exist:
   - Share `index.html`, `cohort.html`, `trend.html` publicly. They're read-only,
     their sidebar only lists each other, and they never show a link to Admin or Cases.
   - Don't share `admin.html` or `cases.html` links publicly. Both sit behind a shared
     password (see §2), and neither has a nav link back from — or to — the public pages.

Every time you update `assets/data/*.json` (via the Admin workflow) and push, GitHub
Pages redeploys automatically within ~1 minute.

## 2. Who can access what

**Public, no login:** `index.html`, `cohort.html`, `trend.html`. Their sidebar shows only
these three tabs — Admin and Cases are never listed, so casual visitors don't know they exist.

**Gated, one shared password:** `admin.html`, `cases.html`, `rom.html`, `hrbp.html`. Each
opens behind its own full-page password screen (`assets/js/auth.js`), all sharing the same
password across L&D, ROMs, and HRBP as requested. They're deliberately **standalone
tools**, not extra tabs bolted onto the main dashboard — no sidebar linking to
Overview/Cohort/Trend, and no cross-links between them either (Cases links forward to ROM
and HRBP in its intro copy, but that's it). Each just has a small "Exit to Dashboard" /
"Log out" pair in its header.

**Change the password before relying on this.** Open any browser console and run:
```js
crypto.subtle.digest("SHA-256", new TextEncoder().encode("your-new-password"))
  .then(b => console.log(Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("")))
```
then paste the printed hash into `ACCESS_HASH` in `assets/js/auth.js`. Default password
is `hamleys2026` — change it.

**Be clear-eyed about what this is and isn't.** This is a deterrent, not real security:
the hash lives in a public JS file, and there's no way to distinguish an L&D person from
a ROM from an HRBP person, or revoke one person's access without changing the password
for everyone. It stops a stumbled-upon link, not a targeted attempt. For real per-person
login — and to let Admin/Cases sync live between an L&D laptop, a ROM's laptop, and an
HRBP's laptop instead of each seeing their own browser's local storage — move Admin &
Cases to a **Google Sheet + Apps Script Web App** (free, no server to maintain, and Apps
Script can send the ROM/HRBP emails directly via `MailApp`). Say the word and I'll build
that next; it's a self-contained follow-up that doesn't touch the public pages.

## 3. Data files

`assets/data/*.json` were generated from the files you shared and are **already live** —
Overview, Cohort and Trend are populated from these out of the box, nothing to re-upload
to see your real data:

- `stores.json` ← `Base_Store_Data_July_2026.xlsx` (125 stores: Store Name, Store Code, ROM, SD, RM)
- `retail_audits.json` ← `Mystery_Audit_Scores_2025-26_Section_wise.xlsx` (459 Retail audits)
- `play_audits.json` ← `Hamleys_PLAY_Audit_Historic_Data_with_Section_wise_scores.xlsx` (43 Play audits)

**"Unmapped" stores:** 28 Retail audit rows reference store codes (mostly airport kiosks —
e.g. `THP0` Puda Multiplex Jalandhar, `TPV4` Bangalore Airport, `TZKZ`/`TZKY` Guwahati
Airport) that don't exist in `Base_Store_Data_July_2026.xlsx`. They show up tagged
**"Unmapped"** everywhere with their real store name still visible — RM/ROM/SD show as
"Unmapped" since there's nothing to map them to, and they're correctly excluded from
RM/ROM/SD filters and the regional leaderboard. Add these 28 codes to Base Store Data
whenever convenient to resolve them.

Only re-upload through Admin when you have **new or corrected** data:
- **Bulk historical reload** → Admin → "Historical Audit Data" upload (pick Retail or Play).
- **Single new audit** → Admin → "Upload Audit PDF Report" — parses the section score
  table from the PDF and adds it as a new audit; always check the "Sections parsed"
  preview afterwards, since PDF layouts vary slightly between waves.
- Either way, finish with **Export updated dataset** and commit the 3 JSON files.

## 4. Cases workflow

Any audit scoring below 80 is auto-flagged. The workflow is now **three separate pages**,
one per role, each behind the same shared password — not one page with buttons for
everyone:

`Flagged → L&D Stage (cases.html) → ROM Stage (rom.html) → HRBP Closed (hrbp.html)`

1. **`cases.html` (L&D):** case appears automatically once a store scores below 80.
   L&D clicks **Trigger L&D Action** and must pick a **reason**:
   `Below 80 — First Time` / `Below 80 — Consecutive` / `Below 60 — First Time` /
   `Below 60 — Consecutive`. This is what ROM and HRBP see next, and is meant to drive
   which action is appropriate. Case moves to **ROM Stage**.
2. **`rom.html` (ROM):** shows every case waiting on this ROM — store name, code, and the
   reason L&D selected, pulled in automatically. ROM fills in **Name / Designation /
   Employee Code / Action** (Warning Letter, Termination Letter, Warning + No Incentive
   this month, Warning + No Incentive 2nd month, or 50% PLI Deduction for the Quarter) and
   clicks **+ Add** — repeatable for multiple employees on the same case. Once all
   defaulters are listed, **Send to HR** moves the case to **HRBP Stage**.
3. **`hrbp.html` (HRBP):** shows store name, code, trigger reason, and the table of
   employees with the action ROM selected for each. Each employee gets its own
   **Action Taken & Closed** button. Once every employee on a case is closed, the case
   itself automatically flips to **Closed** — no separate "close case" step needed.

All three stages, plus the trigger reason, show up live on the **Overview** page's Action
Tracker. By default (no backend configured) "ROM notified" / "HRBP notified" just advance
the stage and show a confirmation toast, with no real email — that's local/offline mode.
**See §7 below to turn on the real Google Sheets + Apps Script backend**, which makes
Cases/ROM/HRBP shared across everyone's browser and sends real email at each step.

## 5. Trend Data page

Pick a store (via the filters, or the "View" link next to any store on Overview/Cohort/Cases)
to see its last 5 audits: an overall-score trend line, latest score vs previous audit, and a
strengths/weaknesses breakdown — the 3 sections it scores highest on average, the 3 it scores
lowest on, plus whichever section moved the most (up or down) across those 5 audits.

## 6. Design

Colour system and type are Hamleys-branded (toy-store red / navy / gold / teal), used across
KPI cards, section bars, score pills and the trend chart — see `assets/css/style.css` for the
token list at the top of the file. All charts are hand-built SVG/CSS (no external chart
library), so nothing depends on a CDN being reachable.
## 7. Turning on real email + a shared backend

Right now Cases/ROM/HRBP data lives in each browser's local storage — fine for testing,
but it means an L&D laptop, a ROM's laptop, and an HRBP's laptop each see their own
disconnected copy, and no real email is sent. `google-apps-script/` contains a complete,
ready-to-deploy fix:

- `google-apps-script/Code.gs` — a Google Apps Script Web App backed by a Google Sheet.
  Handles all the same case actions (sync, trigger, add/remove employee, send to HR, close),
  and sends real email via `MailApp` as `hamleystraining@gmail.com` when L&D triggers a case
  or a ROM sends one to HR.
- `google-apps-script/SETUP.md` — step-by-step deployment instructions (create the Sheet,
  paste the script, deploy as a Web App, get the URL).

Once deployed, paste your Web App URL into `assets/js/config.js`:
```js
const HMAI_CASES_API = "https://script.google.com/macros/s/AKfycb.../exec";
```
Commit and push — `cases.html`, `rom.html`, and `hrbp.html` automatically switch from local
storage to the shared Sheet, with real email at each handoff. Leave `HMAI_CASES_API` empty
to keep using local-only mode (e.g. for testing UI changes without emailing anyone for real).
