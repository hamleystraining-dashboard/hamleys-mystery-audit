# Hamleys Mystery Audit Intelligence

A 3-page Mystery Audit dashboard for Hamleys India — built as a static site
(vanilla HTML/CSS/JS + Chart.js) so **Page 1 (Overview + Store Cohort) can be
published free on GitHub Pages** and shared publicly / internally as a link.

```
├── index.html      Page 1a — Overview: MTD India avg, section bar chart, action tracker
├── cohort.html      Page 1b — Store-wise Cohort: RM/ROM/SD/store/date/score filters, latest 10 audits
├── admin.html       Page 2  — Admin uploads (L&D team only)
├── cases.html        Page 3  — Cases: L&D → ROM → HRBP escalation workflow
├── assets/
│   ├── css/style.css
│   ├── js/data.js    data loading, filtering, cases logic
│   ├── js/ui.js       sidebar + shared widgets
│   └── data/          stores.json, retail_audits.json, play_audits.json (your real data)
```

## 1. Publishing Page 1 to GitHub Pages (public)

1. Create a new GitHub repo, e.g. `hamleys-mystery-audit`.
2. Push everything in this folder to the repo root (`main` branch).
3. In the repo: **Settings → Pages → Source → Deploy from branch → main / (root)**.
4. Your dashboard goes live at `https://<your-org>.github.io/hamleys-mystery-audit/`.
5. `index.html` and `cohort.html` are what you'd share publicly — they only
   **read** `assets/data/*.json`, so nothing typed by a visitor is ever saved
   or exposed.

Every time you update `assets/data/*.json` (see the Admin workflow below) and
push, GitHub Pages redeploys automatically within ~1 minute.

## 2. Who can access what

**Public (no login):** `index.html`, `cohort.html` — these read-only pages
are the ones to link publicly. Their sidebar doesn't even show Admin/Cases,
so casual visitors never see those exist.

**Gated (shared password):** `admin.html`, `cases.html` — both are in the
same repo (GitHub Pages doesn't let you host part of a repo privately), but
each is now behind a **password screen** (`assets/js/auth.js`) using one
shared password for L&D, ROMs, and HRBP, as requested. Once someone enters
it, their browser tab stays unlocked for that session; the two pages' nav
also only reveal each other, not the public pages' "hidden" sibling issue —
they're always linked from the sidebar regardless.

**Change the password before relying on this:** open any browser console
and run
```js
crypto.subtle.digest("SHA-256", new TextEncoder().encode("your-new-password"))
  .then(b => console.log(Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("")))
```
then paste the printed hash into `ACCESS_HASH` in `assets/js/auth.js`. The
default password is `hamleys2026` — change it.

**Be clear-eyed about what this is and isn't.** This is a deterrent, not
real security: the hash lives in a public JS file, so anyone determined
enough could try to crack it offline, and there's no way to tell L&D, ROM,
and HRBP users apart or revoke one person's access without changing the
password for everyone. It stops the "someone stumbles on the link" case,
not a targeted attempt. For real per-person login (and to let Cases sync
live between an L&D laptop, a ROM's laptop, and HRBP's laptop instead of
each seeing their own browser's local storage), move Admin & Cases to a
**Google Sheet + Apps Script Web App** — free, no server to maintain, and
Apps Script can also send the ROM/HRBP emails directly via `MailApp`. The
two files would swap their `localStorage` calls for `fetch()` calls to your
Apps Script URL; the UI stays the same. Say the word and I'll build that
next — it's a self-contained follow-up that doesn't touch the public pages.

## 3. Data files

`assets/data/*.json` were generated from the files you shared **and are
already live in this build** — you don't need to re-upload anything through
Admin to see your real data; Overview and Cohort are populated from these
files out of the box:

- `stores.json` ← `Base_Store_Data_July_2026.xlsx` (125 stores: Store Name, Store Code, ROM, SD, RM)
- `retail_audits.json` ← `Mystery_Audit_Scores_2025-26_Section_wise.xlsx` (459 Retail audits)
- `play_audits.json` ← `Hamleys_PLAY_Audit_Historic_Data_with_Section_wise_scores.xlsx` (43 Play audits)

**"Unmapped" stores:** 28 Retail audit rows reference store codes (mostly
airport kiosks — e.g. `THP0` Puda Multiplex Jalandhar, `TPV4` Bangalore
Airport, `TZKZ`/`TZKY` Guwahati Airport) that don't exist in
`Base_Store_Data_July_2026.xlsx`. Rather than hiding them, they show up
tagged **"Unmapped"** everywhere (Cohort table, Cases, Overview tracker) —
their real store name still shows, but RM/ROM/SD show as "Unmapped" since
there's nothing to map them to, and they're correctly excluded from
RM/ROM/SD filter results (since filtering by an RM can't include a store
with no RM). Add these 28 store codes to Base Store Data via Admin (or
directly in the source Excel + re-export) to resolve them.

Only re-upload through Admin when you have **new or corrected** data:
- **Bulk historical reload** → Admin → "Historical Audit Data" upload (pick Retail or Play), matching the same column layout as the files above.
- **Single new audit** → Admin → "Upload Audit PDF Report". This parses the section score table from the PDF (tested against the Retail and PLAY sample report formats you provided) and adds it as a new audit. PDF layouts vary a little between waves, so **always check the "Sections parsed" preview** after upload — if a section looks missing, add it manually by editing the exported JSON.
- Either way, finish with **Export updated dataset** and commit the 3 JSON files.

## 4. Cases workflow (Page 3)

Any audit scoring below 80 is auto-flagged. Stage badge order:

`Flagged → L&D Stage → ROM Stage → HRBP Closed`

1. **Flagged** — new low-score audit appears automatically.
2. L&D clicks **Trigger L&D Action** → (placeholder) notifies ROM → stage becomes **L&D Stage**.
3. ROM opens the case, enters defaulter name(s) + action notes, clicks **Submit to HRBP** → stage becomes **ROM Stage** (HRBP notified).
4. HRBP reviews, adds closure notes, clicks **Close Case** → stage becomes **HRBP Closed**.

This stage is shown live on the **Overview** page's Action Tracker table, so
leadership sees exactly where every low-scoring store is in the process
without opening Cases.

## 5. Design

Colour system and type are Hamleys-branded (toy-store red / navy / gold /
teal), used across KPI cards, section charts, and score pills throughout —
see `assets/css/style.css` for the token list at the top of the file.
