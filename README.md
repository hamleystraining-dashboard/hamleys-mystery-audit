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

## 2. Should Admin & Cases be public too?

**No — recommended split:**

| Page | Who | Where |
|---|---|---|
| Overview + Cohort (`index.html`, `cohort.html`) | Everyone (public link) | GitHub Pages |
| Admin (`admin.html`) | L&D team only | **Local file, or a private/internal link** |
| Cases (`cases.html`) | L&D + ROMs + HRBP | **Private/internal link**, not the public GitHub Pages URL |

Why: GitHub Pages is a static file host — it can't authenticate users, run a
database, or send email. `admin.html` and `cases.html` currently persist
their state (uploaded data, case stage, defaulter names) to the **browser's
local storage**, which is fine for one person working locally, but:

- it won't sync between an L&D teammate's laptop, a ROM's laptop, and an
  HRBP's laptop — everyone would see a different, disconnected copy of the
  case list;
- there's no real email sending yet — the "Notify ROM" / "Notify HRBP"
  buttons currently just move the case to the next stage and show a
  confirmation toast, as a placeholder for the real trigger.

**Two ways to fix this, in order of effort:**

1. **Quickest for now (what's shipped today):** run `admin.html` locally by
   opening the file directly in a browser (or serving the folder with
   `python -m http.server` and sharing that link only inside the office
   network / VPN). Use it, click **Export updated dataset**, commit the
   downloaded JSON files into `assets/data/`, and push — that refreshes the
   public Overview & Cohort pages. Good for a single L&D owner managing
   uploads centrally.
2. **Recommended once you're ready for multi-user Cases (ROM + HRBP need to
   use it too), and real email:** point Admin & Cases at a small shared
   backend instead of localStorage — the cheapest is a **Google Sheet +
   Apps Script Web App** (free, no server to maintain, and Apps Script can
   send the ROM/HRBP emails directly via `MailApp`). The two files
   (`admin.html`, `cases.html`) would swap their `localStorage` calls for
   `fetch()` calls to your Apps Script URL — the rest of the UI stays the
   same. Happy to build that next once you confirm this is the direction;
   it's a self-contained follow-up and doesn't require touching the public
   Page 1 dashboard at all.

## 3. Data files

`assets/data/*.json` were generated from the files you shared:

- `stores.json` ← `Base_Store_Data_July_2026.xlsx` (Store Name, Store Code, ROM, SD, RM)
- `retail_audits.json` ← `Mystery_Audit_Scores_2025-26_Section_wise.xlsx`
- `play_audits.json` ← `Hamleys_PLAY_Audit_Historic_Data_with_Section_wise_scores.xlsx`

To refresh with new data:
- **Bulk historical reload** → Admin page → "Historical Audit Data" upload (pick Retail or Play), matching the same column layout as the files above.
- **Single new audit** → Admin page → "Upload Audit PDF Report". This parses the section score table from the PDF (tested against the Retail and PLAY sample report formats you provided) and adds it as a new audit. PDF layouts vary a little between waves, so **always check the "Sections parsed" preview** after upload — if a section looks missing, add it manually by editing the exported JSON.
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
