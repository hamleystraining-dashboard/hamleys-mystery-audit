# Hamleys Mystery Audit Intelligence

A Mystery Audit dashboard for Hamleys India — built as a static site
(vanilla HTML/CSS/JS, no chart library dependency) so the public dashboard
can be published free on GitHub Pages.

```
├── index.html      Overview — India avg, section scores, regional leaderboard, action tracker
├── cohort.html      Store Cohort — RM/ROM/SD/store/date/score filters, latest 10 audits
├── trend.html        Trend Data — last-5-audit trend + strengths/weaknesses per store
├── admin.html         Standalone, password-gated — L&D data uploads (not in the public nav)
├── cases.html          Standalone, password-gated — L&D → ROM → HRBP case workflow (not in the public nav)
├── assets/
│   ├── css/style.css
│   ├── js/data.js     data loading, filtering, cases, leaderboard & SWOT logic
│   ├── js/ui.js        sidebar / standalone header + shared widgets
│   ├── js/auth.js       shared password gate for admin.html & cases.html
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

**Gated, one shared password:** `admin.html` and `cases.html`. Each opens behind a full-page
password screen (`assets/js/auth.js`), as requested, one password shared across L&D, ROMs,
and HRBP. They're deliberately **standalone tools**, not extra tabs bolted onto the main
dashboard — no sidebar linking to Overview/Cohort/Trend, and no link between Admin and
Cases either. Each just has a small "Exit to Dashboard" / "Log out" pair in its header.

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

Any audit scoring below 80 is auto-flagged. Stage order:
`Flagged → L&D Stage → ROM Stage → HRBP Closed`

1. **Flagged** — new low-score audit appears automatically.
2. L&D clicks **Trigger L&D Action** → stage becomes **L&D Stage** (ROM notified — see note below).
3. ROM opens the case, enters defaulter name(s) + action notes, clicks **Submit to HRBP** →
   stage becomes **ROM Stage** (HRBP notified).
4. HRBP reviews, adds closure notes, clicks **Close Case** → stage becomes **HRBP Closed**.

This stage is shown live on the **Overview** page's Action Tracker table. Note: since this
is a static site with no backend yet, the "notify" steps currently just advance the stage
and show a confirmation toast — there's no real email being sent. That's exactly what the
Google Sheets + Apps Script upgrade in §2 would add.

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
