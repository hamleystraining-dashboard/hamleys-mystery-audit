# Hamleys Mystery Audit Intelligence — v1.0

A static, framework-free GitHub Pages dashboard for Hamleys India leadership,
Ops/ROMs and HR to monitor Mystery Audit performance (Retail & PLAY) and
track defaulter/HR actions end to end.

Built with plain HTML, CSS and JavaScript + Apache ECharts. No build step,
no backend — works directly on GitHub Pages.

## Pages

| Page | Audience | Purpose |
|---|---|---|
| `index.html` | Everyone | Executive overview — India-wide KPIs, trends, top/bottom stores |
| `rm.html` / `rom.html` / `sd.html` | Leadership | Same dashboard, scoped to a Regional Manager / Regional Ops Manager / Store Director |
| `store.html` | Leadership | Single-store deep dive — history, timeline, strongest/weakest sections |
| `admin.html` | L&D | Upload Base Store Master (Excel) and Retail/PLAY Mystery Audit PDF reports |
| `cases.html` | ROM / HR | ROMs report defaulters; HR confirms Warning / Final Warning / Termination |

Every page shares one sidebar (Overview, RM Wise, ROM Wise, SD Wise, Store
Wise, Admin, Defaulters & HR) with the current page highlighted.

## How data flows

1. **Admin** uploads the Base Store Master (Store Name, Store Code, RM Name,
   ROM Name, SD Name) and the PDF Mystery Audit reports exported per visit.
2. `parser.js` extracts the *Sectional Change* table straight from each PDF
   (section name, actual/possible score) and computes the overall score as
   `Σactual / Σpossible`. Retail reports have 7 major sections
   (H‑A‑M‑L‑E‑Y‑S); PLAY reports have 8 (Attraction, Welcome, Entry
   Assistance, Safety, Out For Play, Magic Pillars, Exit, CSD Birthday
   Enquiry).
3. `dataService.js` is the single source of truth. Everything is persisted
   to `localStorage`, so an Admin upload is immediately visible on every
   other page/tab without a backend.
4. `dashboard.js` is one generic controller reused by every scoped page
   (Overview/RM/ROM/SD/Store) — it reads filters, asks `dataService.js` for
   a summary, and renders KPIs/tables. It contains no chart or data logic
   of its own.
5. `charts.js` is a generic ECharts registry — any page can render a trend,
   bar, pie or radar chart into any container id.
6. `cases.js` is the HR case data layer (create/update/status/export);
   `cases.html` supplies its own small UI script since its workflow (report
   → HR review → close) is unique to that page.

## Architecture

```
assets/
  css/        style.css, dashboard.css, animations.css   (shared design system)
  js/
    dataService.js   single source of truth + localStorage persistence
    parser.js        Excel (base store) + PDF (audit report) parsing only
    charts.js         generic ECharts rendering, no data logic
    dashboard.js      generic KPI/table controller shared by 5 pages
    cases.js          HR case data layer
    admin.js          Admin Portal upload workflow only
    app.js            business toggle, dates, toast/loader utilities
    navigation.js      sidebar highlighting + cross-page navigation
  images/hamleys-logo.png
```

Each scoped page (`rm.html`, `rom.html`, `sd.html`) declares a small
`PAGE_CONFIG` object before `dashboard.js` loads, e.g.:

```html
<script>window.PAGE_CONFIG = { scope: "rm", prefix: "rm", selectId: "rmFilter" };</script>
```

`dashboard.js` uses `prefix` to find/populate that page's KPI, chart and
table elements (`rmAverageScore`, `rmTrendChart`, `rmTopStores`, …), so the
same controller works for every hierarchy level with zero duplicated code.

## Deploying

Push to a GitHub repository and enable **GitHub Pages** (Settings → Pages →
Deploy from branch → `main` / root). No build step required.

## Data notes

- All audit and store data lives only in each browser's `localStorage`
  under the key `hamleysMysteryAuditData` — there is no shared backend, so
  data uploaded on one device/browser will not automatically appear on
  another. Use **Export Database (JSON)** on the Admin page to back up or
  hand off data.
- Duplicate PDF uploads (same Evaluation ID) are automatically skipped.

## Defaulter Action Process (Below 80 / Below 60)

A three-stage, tracked workflow for underperforming stores, run entirely from `cases.html`:

1. **L&D** — sees stores whose latest audit is below 80% or below 60% (candidate
   list auto-refreshes from live audit data) and clicks **Start Action Process**.
   This creates a tracked case and opens a pre-filled email to that store's RM
   and ROM (if their emails are known — see below).
2. **ROM** — opens the Defaulters page, finds the store under *Awaiting ROM
   Submission*, and submits the defaulting employee's name/code plus the
   Store Director's name/code. This opens a pre-filled email to HR.
3. **HR (HRBP / HR Head)** — finds the store under *Awaiting HR Action*,
   selects Warning Letter / PLI Stop Letter / Termination Letter per policy,
   and closes the process.

**Process Tracker** — a running table (✓/✗ per stakeholder, with a red
"Delayed" flag once a stage misses its SLA) is shown in full on the
Defaulters page and as a compact widget on the main Overview dashboard.
SLA thresholds are set in `assets/js/cases.js` (`SLA_DAYS` — defaults:
L&D 3 days, ROM 3 days, HR 5 days) and are easy to change to match actual
policy.

### Email notifications — important limitation

This is a static GitHub Pages site with **no backend**, so it cannot send
email automatically. Every notification step instead opens a `mailto:` link
pre-filled with subject/recipient/body — the person triggering the step
still has to hit send in their own mail client. This keeps the loop
functioning without needing a server, but it is not silent/automatic.

- RM/ROM/SD email addresses are optional columns (`RM Email`, `ROM Email`,
  `SD Email`) in the Base Store Master upload. If present, they're used to
  pre-fill the "to" field; if absent, the notification step still runs but
  shows a warning that no email was found.
- The HR notification address is a single setting saved in the browser
  (Defaulters page → "HR Notification Email").
- If fully automatic email is needed later, the mailto calls in `cases.html`
  can be swapped for a client-side email API (e.g. EmailJS) — that requires
  a (free) EmailJS account and API key, which isn't set up here.
