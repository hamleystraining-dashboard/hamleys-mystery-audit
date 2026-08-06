/* ==========================================================================
   Hamleys Mystery Audit Intelligence — shared data layer
   Loads base data from /assets/data/*.json, layers on any locally-uploaded
   data (Admin page) that's been synced into localStorage, and exposes
   query helpers used by all three pages.
   ========================================================================== */

const HMAI = (() => {

  const LS_KEYS = {
    stores: "hmai_stores_override",
    retail: "hmai_retail_override",
    play: "hmai_play_override",
    cases: "hmai_cases",
    caseLog: "hmai_case_log",
  };

  let STORES = [];
  let RETAIL = [];
  let PLAY = [];
  let STORE_INDEX = {}; // storeCode -> store

  async function loadJSON(path) {
    if (location.protocol === "file:") {
      throw new Error("FILE_PROTOCOL");
    }
    // Cache-bust every load: without this, a colleague's browser (or
    // GitHub's own CDN) can keep serving an old cached copy of these files
    // for a while after a fresh publish, which is exactly why "I updated
    // it but my colleague still sees old data" happens on a shared link.
    const bustedPath = path + (path.includes("?") ? "&" : "?") + "v=" + Date.now();
    const res = await fetch(bustedPath, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load " + path);
    return res.json();
  }

  function readOverride(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  async function init() {
    const base = "assets/data/";
    const [stores, retail, play] = await Promise.all([
      loadJSON(base + "stores.json"),
      loadJSON(base + "retail_audits.json"),
      loadJSON(base + "play_audits.json"),
    ]);

    // Locally-uploaded data (via Admin) only ever applies ON Admin itself,
    // for previewing an upload before publishing it. Every other page
    // (Overview, Cohort, Trend, Cases, ROM, HRBP) must read the SAME
    // published data on every device — a browser that once used Admin for
    // testing must never permanently see different numbers than one that
    // never touched it. That mismatch was exactly the "different devices
    // show different data" bug.
    const adminMode = typeof HMAI_ADMIN_MODE !== "undefined" && HMAI_ADMIN_MODE;
    const storesOv = adminMode ? readOverride(LS_KEYS.stores) : null;
    const retailOv = adminMode ? readOverride(LS_KEYS.retail) : null;
    const playOv = adminMode ? readOverride(LS_KEYS.play) : null;

    STORES = mergeStores(stores, storesOv);
    RETAIL = mergeAudits(retail, retailOv);
    PLAY = mergeAudits(play, playOv);

    STORE_INDEX = {};
    STORES.forEach(s => STORE_INDEX[s.storeCode] = s);

    return { stores: STORES, retail: RETAIL, play: PLAY };
  }

  function mergeStores(base, override) {
    // A Base Store Data upload REPLACES the list entirely, not a union with
    // the originally-bundled file — otherwise closed/renamed stores from the
    // shipped assets/data/stores.json would keep reappearing forever.
    if (!override || !override.length) return base;
    return override;
  }

  function mergeAudits(base, override) {
    if (!override || !override.length) return base;
    const map = {};
    base.forEach(a => map[a.evalId] = a);
    override.forEach(a => map[a.evalId] = a);
    return Object.values(map);
  }

  function storeMeta(storeCode, fallbackName) {
    return STORE_INDEX[storeCode] || { storeName: fallbackName || storeCode, rom: "Unmapped", sd: "Unmapped", rm: "Unmapped", hrbp: "Unmapped", unmapped: true };
  }

  function audits(vertical) {
    return vertical === "play" ? PLAY : RETAIL;
  }

  function sectionNames(vertical) {
    const list = audits(vertical);
    if (!list.length) return [];
    return Object.keys(list[0].sections);
  }

  function inDateRange(dateStr, from, to) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (from && d < new Date(from)) return false;
    if (to && d > new Date(to)) return false;
    return true;
  }

  function scoreClass(score) {
    if (score < 60) return "s-bad";
    if (score < 80) return "s-warn";
    return "s-good";
  }

  function scoreTag(score) {
    if (score < 60) return { cls: "bad", label: "Below 60" };
    if (score < 80) return { cls: "warn", label: "Below 80" };
    return { cls: "good", label: "On Track" };
  }

  function mtd(vertical) {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return audits(vertical).filter(a => new Date(a.date) >= from);
  }

  function avg(list, key) {
    key = key || "score";
    const vals = list.map(a => a[key]).filter(v => typeof v === "number");
    if (!vals.length) return null;
    return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10;
  }

  function sectionAverages(list, vertical) {
    const names = sectionNames(vertical);
    const out = {};
    names.forEach(n => {
      const vals = list.map(a => a.sections[n]).filter(v => typeof v === "number");
      out[n] = vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10 : null;
    });
    return out;
  }

  function withStoreMeta(a) {
    const m = storeMeta(a.storeCode, a.storeName);
    return Object.assign({}, a, { rom: m.rom, sd: m.sd, rm: m.rm, hrbp: m.hrbp, unmapped: !!m.unmapped, storeNameResolved: m.storeName || a.storeName });
  }

  function filterAudits(vertical, filters) {
    filters = filters || {};
    let list = audits(vertical).map(withStoreMeta);
    if (filters.rm) list = list.filter(a => a.rm === filters.rm);
    if (filters.rom) list = list.filter(a => a.rom === filters.rom);
    if (filters.sd) list = list.filter(a => a.sd === filters.sd);
    if (filters.storeCode) list = list.filter(a => a.storeCode === filters.storeCode);
    if (filters.from || filters.to) list = list.filter(a => inDateRange(a.date, filters.from, filters.to));
    if (filters.below80) list = list.filter(a => a.score < 80);
    if (filters.below60) list = list.filter(a => a.score < 60);
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function uniqueValues(vertical, field) {
    const set = new Set();
    audits(vertical).forEach(a => {
      const m = storeMeta(a.storeCode, a.storeName);
      if (m[field] && m[field] !== "Unmapped") set.add(m[field]);
    });
    return Array.from(set).sort();
  }

  // Cascading hierarchy helpers: given filters already chosen upstream
  // (rm -> rom -> sd -> store), return only the option list valid at the
  // next level down, scoped to stores that actually have audits in this vertical.
  function cascadingValues(vertical, field, upstream) {
    upstream = upstream || {};
    const set = new Set();
    audits(vertical).forEach(a => {
      const m = storeMeta(a.storeCode, a.storeName);
      if (m.unmapped) return;
      if (upstream.rm && m.rm !== upstream.rm) return;
      if (upstream.rom && m.rom !== upstream.rom) return;
      if (upstream.sd && m.sd !== upstream.sd) return;
      if (field === "storeName") { if (m.storeName) set.add(m.storeName); return; }
      if (m[field]) set.add(m[field]);
    });
    return Array.from(set).sort();
  }

  function latestPerStore(vertical, n) {
    const list = audits(vertical).map(withStoreMeta).sort((a, b) => new Date(b.date) - new Date(a.date));
    return list.slice(0, n || 10);
  }

  // ---- Regional leaderboard (Overview page) --------------------------------
  // Groups audits by rm / rom / sd and ranks by average score, for a
  // leadership-level "who's doing well, who isn't" view.
  function regionalLeaderboard(vertical, groupField, filters) {
    filters = filters || {};
    let list = audits(vertical).map(withStoreMeta).filter(a => !a.unmapped);
    if (filters.from || filters.to) list = list.filter(a => inDateRange(a.date, filters.from, filters.to));
    const groups = {};
    list.forEach(a => {
      const key = a[groupField];
      if (!key) return;
      if (!groups[key]) groups[key] = { name: key, audits: [], below80: 0, below60: 0 };
      groups[key].audits.push(a.score);
      if (a.score < 80) groups[key].below80++;
      if (a.score < 60) groups[key].below60++;
    });
    const rows = Object.values(groups).map(g => ({
      name: g.name,
      avg: Math.round((g.audits.reduce((s, v) => s + v, 0) / g.audits.length) * 10) / 10,
      count: g.audits.length,
      below80: g.below80,
      below60: g.below60,
    }));
    rows.sort((a, b) => b.avg - a.avg);
    return rows;
  }

  // ---- Trend / SWOT analysis (Trend Data page) ------------------------------
  // Returns the last `n` audits for a store (chronological, oldest first)
  // plus a strengths/weaknesses breakdown of its sections over that window.
  function storeAuditHistory(vertical, storeCode, n) {
    n = n || 5;
    const list = audits(vertical)
      .filter(a => a.storeCode === storeCode)
      .map(withStoreMeta)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, n)
      .sort((a, b) => new Date(a.date) - new Date(b.date)); // chronological for charting
    return list;
  }

  function sectionSwot(vertical, storeCode, n) {
    const list = storeAuditHistory(vertical, storeCode, n);
    if (list.length < 1) return { audits: [], sections: [], strengths: [], weaknesses: [], mostImproved: null, mostDeclined: null };

    const names = sectionNames(vertical);
    const sections = names.map(name => {
      const vals = list.map(a => a.sections[name]).filter(v => typeof v === "number");
      const avgVal = vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10 : null;
      const first = vals.length ? vals[0] : null;
      const last = vals.length ? vals[vals.length - 1] : null;
      const delta = (first !== null && last !== null) ? Math.round((last - first) * 10) / 10 : null;
      return { name, avg: avgVal, first, last, delta };
    }).filter(s => s.avg !== null);

    const byAvgDesc = [...sections].sort((a, b) => b.avg - a.avg);
    const byAvgAsc = [...sections].sort((a, b) => a.avg - b.avg);
    const byDeltaAsc = [...sections].filter(s => s.delta !== null).sort((a, b) => a.delta - b.delta);
    const byDeltaDesc = [...sections].filter(s => s.delta !== null).sort((a, b) => b.delta - a.delta);

    return {
      audits: list,
      sections,
      strengths: byAvgDesc.slice(0, 3),
      weaknesses: byAvgAsc.slice(0, 3),
      mostImproved: byDeltaDesc.length && byDeltaDesc[0].delta > 0 ? byDeltaDesc[0] : null,
      mostDeclined: byDeltaAsc.length && byDeltaAsc[0].delta < 0 ? byDeltaAsc[0] : null,
    };
  }

  // ---- Cases (Page 3: L&D trigger, ROM defaulters, HRBP closure) ----------
  // Every function below is async and dual-mode: if HMAI_CASES_API is set
  // (assets/js/config.js), it calls the deployed Apps Script Web App so
  // every user shares one live Sheet and real emails go out. If it's left
  // empty, everything falls back to this browser's local storage only —
  // useful for testing UI changes without touching the real Sheet/emails.
  const TRIGGER_REASONS = {
    "80_first": "Below 80 — First Time",
    "80_consecutive": "Below 80 — Consecutive",
    "60_first": "Below 60 — First Time",
    "60_consecutive": "Below 60 — Consecutive",
  };
  const ROM_ACTIONS = [
    "Warning Letter",
    "Termination Letter",
    "Warning Letter + No Incentive (this month)",
    "Warning Letter + No Incentive (2nd month with low score)",
    "50% PLI Deduction for the Quarter",
  ];
  const EMPLOYEE_DESIGNATIONS = [
    { value: "FC", label: "FC — Fun Consultant" },
    { value: "SM", label: "SM — Store Manager" },
    { value: "SD", label: "SD — Store Director" },
  ];
  // From Base Store Data's HRBP column — extend this list if more HRBPs
  // are added later (or map it dynamically once every case reliably
  // carries its own hrbp field going forward).
  const HRBP_NAMES = ["Aayushi", "Nazim", "Ravi", "Sachita"];
  // The escalation policy: what action applies for a given employee
  // designation, at a given trigger reason (score threshold + occurrence).
  // Keyed as "<designation>|<triggerReason>". Combinations that aren't in
  // the policy (e.g. FC at <60% two consecutive — already terminated at
  // first occurrence, so there's nothing further to define) are simply
  // absent; the UI falls back to letting the ROM pick manually for those.
  const POLICY_MATRIX = {
    "FC|80_first": "Warning Letter",
    "FC|80_consecutive": "Termination Letter",
    "FC|60_first": "Termination Letter",
    "SM|80_first": "Warning Letter",
    "SM|80_consecutive": "Warning Letter + No Incentive (2nd month with low score)",
    "SM|60_first": "Warning Letter + No Incentive (this month)",
    "SM|60_consecutive": "Termination Letter",
    "SD|80_consecutive": "Warning Letter",
    "SD|60_first": "Warning Letter",
    "SD|60_consecutive": "50% PLI Deduction for the Quarter",
  };
  function suggestAction(designation, triggerReason) {
    return POLICY_MATRIX[designation + "|" + triggerReason] || null;
  }

  // ---- Supabase-backed persistence ----------------------------------------
  // Cases live in a single shared `cases` table (see SUPABASE_SETUP.md) —
  // every read fetches live from Supabase, every write commits immediately.
  // Nothing is saved locally and nothing needs manual export/upload; the
  // moment someone clicks Trigger / Send to HR / Close, it's live for
  // everyone within seconds.
  function supaHeaders(extra) {
    return Object.assign({
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    }, extra || {});
  }

  function rowToCase(row) {
    return {
      key: row.key, vertical: row.vertical, evalId: row.eval_id, storeCode: row.store_code,
      storeName: row.store_name, unmapped: !!row.unmapped, rom: row.rom, sd: row.sd, rm: row.rm, hrbp: row.hrbp,
      date: row.date, score: Number(row.score), stage: row.stage, triggerReason: row.trigger_reason,
      employees: row.employees || [], history: row.history || [],
    };
  }

  // Maps whichever camelCase fields are present on `c` to their snake_case
  // column names — works for both a full case object (upsert) and a
  // partial patch (only the fields being changed).
  function caseToRow(c) {
    const map = {
      key: "key", vertical: "vertical", evalId: "eval_id", storeCode: "store_code",
      storeName: "store_name", unmapped: "unmapped", rom: "rom", sd: "sd", rm: "rm", hrbp: "hrbp",
      date: "date", score: "score", stage: "stage", triggerReason: "trigger_reason",
      employees: "employees", history: "history",
    };
    const row = {};
    Object.keys(map).forEach(k => { if (k in c) row[map[k]] = c[k]; });
    return row;
  }

  async function supaRequest(path, opts) {
    const res = await fetch(SUPABASE_URL + "/rest/v1/" + path, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Supabase error (HTTP ${res.status})`);
    }
    return res.json();
  }

  async function getCases() {
    const rows = await supaRequest("cases?select=*", { headers: supaHeaders(), cache: "no-store" });
    return rows.map(rowToCase);
  }

  async function getCaseByKey(key) {
    const rows = await supaRequest(`cases?key=eq.${encodeURIComponent(key)}&select=*`, { headers: supaHeaders(), cache: "no-store" });
    return rows[0] ? rowToCase(rows[0]) : null;
  }

  // Defensive safety net: if the same store somehow has more than one case
  // row (e.g. a leftover duplicate from before syncCasesFromAudits was
  // fixed to prevent this at the source), show only one — whichever is
  // still open if any are, else the most recently dated. Used by every
  // page that lists cases, so a stray duplicate in the database can't
  // surface anywhere in the UI while it awaits manual cleanup in Supabase.
  function dedupeCasesByStore(cases) {
    const stageRank = { flagged: 0, ld_triggered: 1, rom_submitted: 2, hrbp_closed: 3 };
    const byStore = {};
    cases.forEach(c => {
      const k = c.vertical + "|" + c.storeCode;
      const prev = byStore[k];
      if (!prev) { byStore[k] = c; return; }
      const prevOpen = prev.stage !== "hrbp_closed";
      const curOpen = c.stage !== "hrbp_closed";
      if (curOpen && !prevOpen) { byStore[k] = c; return; }
      if (!curOpen && prevOpen) { return; }
      // Both open, or both closed: prefer whichever is further along the
      // workflow (more actual progress made on it) — a case that's already
      // been triggered/sent to HR should never lose to a newer-but-untouched
      // duplicate just because its audit date is more recent.
      const prevRank = stageRank[prev.stage] ?? 0;
      const curRank = stageRank[c.stage] ?? 0;
      if (curRank > prevRank) { byStore[k] = c; }
      else if (curRank === prevRank && new Date(c.date) > new Date(prev.date)) { byStore[k] = c; }
    });
    return Object.values(byStore);
  }

  async function upsertCases(cases) {
    if (!cases.length) return [];
    const rows = await supaRequest("cases", {
      method: "POST",
      headers: supaHeaders({ Prefer: "resolution=merge-duplicates,return=representation" }),
      body: JSON.stringify(cases.map(caseToRow)),
    });
    return rows.map(rowToCase);
  }

  async function patchCase(key, patch) {
    const rows = await supaRequest(`cases?key=eq.${encodeURIComponent(key)}`, {
      method: "PATCH",
      headers: supaHeaders({ Prefer: "return=representation" }),
      body: JSON.stringify(caseToRow(patch)),
    });
    return rows[0] ? rowToCase(rows[0]) : null;
  }

  function caseKey(vertical, evalId) { return vertical + ":" + evalId; }

  function genEmployeeId() {
    return "emp_" + Math.random().toString(36).slice(2, 9);
  }

  // Rebuild the case list from current audit data: any audit scoring <80
  // gets a case record if one doesn't already exist. Only writes to
  // Supabase when there's actually something new/changed — a normal page
  // view with nothing new to flag is a pure read, no write, no prompt.
  async function syncCasesFromAudits() {
    const rawCandidates = [];
    ["retail", "play"].forEach(v => {
      audits(v).forEach(a => {
        if (a.score < 80) {
          const meta = storeMeta(a.storeCode, a.storeName);
          rawCandidates.push({
            key: caseKey(v, a.evalId), vertical: v, evalId: a.evalId, storeCode: a.storeCode,
            storeName: meta.storeName || a.storeName, unmapped: !!meta.unmapped,
            rom: meta.rom, sd: meta.sd, rm: meta.rm, hrbp: meta.hrbp, date: a.date, score: a.score,
          });
        }
      });
    });
    if (!rawCandidates.length) return getCases();

    // A store can easily have several below-80 audits at once (repeated
    // poor performance) — collapse those to just the LATEST one per store
    // before matching against existing cases, so one sync pass can never
    // create more than one new case for the same store. Older below-80
    // audits for that store remain fully visible via Cohort/Trend; they're
    // just not each tracked as a separate case.
    const latestByStore = {};
    rawCandidates.forEach(c => {
      const k = c.vertical + "|" + c.storeCode;
      const prev = latestByStore[k];
      if (!prev || new Date(c.date) > new Date(prev.date)) latestByStore[k] = c;
    });
    const candidates = Object.values(latestByStore);

    const existing = await getCases();
    const existingByKey = {};
    existing.forEach(c => existingByKey[c.key] = c);
    // Secondary lookup: an OPEN (not yet hrbp_closed) case for this same
    // store, regardless of which evalId it was created under. A PDF's
    // internal report ID isn't always stable across separate upload
    // sessions — without this, a store that already has an active case
    // could get a second, duplicate case row the moment its evalId drifts,
    // instead of the existing one being updated. Once a case is closed,
    // a new low score legitimately starts a fresh case (new escalation
    // cycle), so closed cases are deliberately excluded from this lookup.
    const openByStore = {};
    existing.forEach(c => {
      if (c.stage !== "hrbp_closed") openByStore[c.vertical + "|" + c.storeCode] = c;
    });

    const toUpsert = [];
    candidates.forEach(c => {
      const ec = existingByKey[c.key] || openByStore[c.vertical + "|" + c.storeCode];
      if (ec) {
        const changed = ec.storeName !== c.storeName || ec.unmapped !== c.unmapped || ec.rom !== c.rom ||
          ec.sd !== c.sd || ec.rm !== c.rm || ec.hrbp !== c.hrbp || ec.date !== c.date || ec.score !== c.score;
        if (changed) {
          // Update in place, under the EXISTING row's own key/evalId — even
          // if matched via the store fallback with a different incoming
          // evalId — so this always stays one row per store, never two.
          toUpsert.push(Object.assign({}, ec, {
            storeName: c.storeName, unmapped: c.unmapped, rom: c.rom, sd: c.sd, rm: c.rm, hrbp: c.hrbp,
            date: c.date, score: c.score,
          }));
        }
      } else {
        toUpsert.push(Object.assign({}, c, {
          stage: "flagged", triggerReason: null, employees: [],
          history: [{ stage: "flagged", at: new Date().toISOString(), by: "System", note: "Auto-flagged: score below 80" }],
        }));
      }
    });

    // Auto-resolve stale flags: if a store's LATEST audit is no longer
    // below 80 (e.g. a corrected re-upload fixed the score) but it still
    // has an untouched "flagged" case sitting open, close that case
    // automatically rather than leaving a stale flag around forever.
    // Deliberately scoped to stage === "flagged" only — once a human has
    // acted (triggered, named defaulters, sent to HR), a score correction
    // must never silently cancel real work already in motion; a person
    // has to decide what happens to that case from here.
    const candidateStoreKeys = new Set(candidates.map(c => c.vertical + "|" + c.storeCode));
    const alreadyQueued = new Set(toUpsert.map(c => c.key));
    existing.forEach(c => {
      if (c.stage !== "flagged") return; // only untouched cases auto-resolve
      const k = c.vertical + "|" + c.storeCode;
      if (candidateStoreKeys.has(k)) return; // still genuinely below 80
      if (alreadyQueued.has(c.key)) return;
      const latestAudit = audits(c.vertical)
        .filter(a => a.storeCode === c.storeCode)
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      if (!latestAudit || latestAudit.score < 80) return; // no confirming data, leave as-is
      toUpsert.push(Object.assign({}, c, {
        stage: "hrbp_closed",
        score: latestAudit.score,
        date: latestAudit.date,
        history: (c.history || []).concat([{
          stage: "hrbp_closed", at: new Date().toISOString(), by: "System",
          note: `Auto-resolved — a later audit corrected the score to ${latestAudit.score}% (no longer below 80). No action had been taken on this case yet, so it was closed automatically.`,
        }]),
      }));
    });

    if (!toUpsert.length) return existing;
    await upsertCases(toUpsert);
    return getCases();
  }

  async function triggerLdAction(key, reason) {
    const c = await getCaseByKey(key);
    if (!c) throw new Error("Case not found: " + key);
    const history = (c.history || []).concat([{ stage: "ld_triggered", at: new Date().toISOString(), by: "L&D Team", note: "Reason: " + (TRIGGER_REASONS[reason] || reason) }]);
    return patchCase(key, { stage: "ld_triggered", triggerReason: reason, history });
  }

  // ROM adds one defaulter row at a time (id assigned here so the UI can
  // reference it immediately for edits/removal before "Send to HR").
  async function addEmployee(key, employee) {
    const c = await getCaseByKey(key);
    if (!c) throw new Error("Case not found: " + key);
    const employees = (c.employees || []).concat([Object.assign({ id: genEmployeeId(), addedAt: new Date().toISOString(), closed: false, closedAt: null, closedBy: null, closureNote: "" }, employee)]);
    return patchCase(key, { employees });
  }

  async function removeEmployee(key, employeeId) {
    const c = await getCaseByKey(key);
    if (!c) throw new Error("Case not found: " + key);
    const employees = (c.employees || []).filter(e => e.id !== employeeId);
    return patchCase(key, { employees });
  }

  async function sendToHR(key) {
    const c = await getCaseByKey(key);
    if (!c) throw new Error("Case not found: " + key);
    if (!(c.employees || []).length) throw new Error("Add at least one employee before sending to HR");
    const history = (c.history || []).concat([{ stage: "rom_submitted", at: new Date().toISOString(), by: "ROM", note: `${c.employees.length} employee(s) submitted.` }]);
    return patchCase(key, { stage: "rom_submitted", history });
  }

  // HRBP closes one employee's action; once every employee on the case is
  // closed, the case itself auto-advances to hrbp_closed.
  async function closeEmployee(key, employeeId, closureNote, closedByName) {
    const c = await getCaseByKey(key);
    if (!c) throw new Error("Case not found: " + key);
    const emp = (c.employees || []).find(e => e.id === employeeId);
    if (!emp) throw new Error("Employee not found: " + employeeId);
    const who = closedByName || "HRBP";
    const employees = c.employees.map(e => e.id === employeeId
      ? Object.assign({}, e, { closed: true, closedAt: new Date().toISOString(), closedBy: who, closureNote: closureNote || "" })
      : e);
    const allClosed = employees.length > 0 && employees.every(e => e.closed);
    const patch = { employees };
    if (allClosed && c.stage !== "hrbp_closed") {
      patch.stage = "hrbp_closed";
      patch.history = (c.history || []).concat([{ stage: "hrbp_closed", at: new Date().toISOString(), by: who, note: "All employee actions closed" }]);
    }
    return patchCase(key, patch);
  }

  // ---- Admin uploads ------------------------------------------------------
  function saveOverride(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function exportAllData() {
    return {
      stores: STORES, retail: RETAIL, play: PLAY,
      exportedAt: new Date().toISOString()
    };
  }

  function storesWithAudits(vertical) {
    return audits(vertical)
      .map(withStoreMeta)
      .filter((a, i, arr) => arr.findIndex(x => x.storeCode === a.storeCode) === i)
      .map(a => ({ storeCode: a.storeCode, storeName: a.storeNameResolved, rm: a.rm, rom: a.rom, sd: a.sd, unmapped: a.unmapped }))
      .sort((a, b) => a.storeName.localeCompare(b.storeName));
  }

  return {
    LS_KEYS, TRIGGER_REASONS, ROM_ACTIONS, EMPLOYEE_DESIGNATIONS, HRBP_NAMES, POLICY_MATRIX, suggestAction, init, storeMeta, audits, sectionNames, inDateRange, scoreClass, scoreTag,
    mtd, avg, sectionAverages, filterAudits, uniqueValues, cascadingValues, latestPerStore,
    regionalLeaderboard, storeAuditHistory, sectionSwot, storesWithAudits,
    getCases, getCaseByKey, dedupeCasesByStore, caseKey, syncCasesFromAudits, triggerLdAction, sendToHR,
    addEmployee, removeEmployee, closeEmployee,
    saveOverride, exportAllData, get STORES() { return STORES; }, get RETAIL() { return RETAIL; }, get PLAY() { return PLAY; }
  };
})();
