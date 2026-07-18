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
    const res = await fetch(path);
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

    // Locally-uploaded data (via Admin page) takes precedence / is merged in.
    const storesOv = readOverride(LS_KEYS.stores);
    const retailOv = readOverride(LS_KEYS.retail);
    const playOv = readOverride(LS_KEYS.play);

    STORES = mergeStores(stores, storesOv);
    RETAIL = mergeAudits(retail, retailOv);
    PLAY = mergeAudits(play, playOv);

    STORE_INDEX = {};
    STORES.forEach(s => STORE_INDEX[s.storeCode] = s);

    return { stores: STORES, retail: RETAIL, play: PLAY };
  }

  function mergeStores(base, override) {
    if (!override || !override.length) return base;
    const map = {};
    base.forEach(s => map[s.storeCode] = s);
    override.forEach(s => map[s.storeCode] = s); // override wins
    return Object.values(map);
  }

  function mergeAudits(base, override) {
    if (!override || !override.length) return base;
    const map = {};
    base.forEach(a => map[a.evalId] = a);
    override.forEach(a => map[a.evalId] = a);
    return Object.values(map);
  }

  function storeMeta(storeCode, fallbackName) {
    return STORE_INDEX[storeCode] || { storeName: fallbackName || storeCode, rom: "Unmapped", sd: "Unmapped", rm: "Unmapped", unmapped: true };
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
    return Object.assign({}, a, { rom: m.rom, sd: m.sd, rm: m.rm, unmapped: !!m.unmapped, storeNameResolved: m.storeName || a.storeName });
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

  // ---- Cases (Page 3) ---------------------------------------------------
  function getCases() {
    return readOverride(LS_KEYS.cases) || [];
  }

  function saveCases(cases) {
    localStorage.setItem(LS_KEYS.cases, JSON.stringify(cases));
  }

  function caseKey(vertical, evalId) { return vertical + ":" + evalId; }

  // Rebuild the case list from current audit data: any audit scoring <80 gets
  // a case record if one doesn't already exist. Existing case progress is preserved.
  function syncCasesFromAudits() {
    const existing = getCases();
    const existingMap = {};
    existing.forEach(c => existingMap[c.key] = c);

    const flagged = [];
    ["retail", "play"].forEach(v => {
      audits(v).forEach(a => {
        if (a.score < 80) {
          const key = caseKey(v, a.evalId);
          const meta = storeMeta(a.storeCode, a.storeName);
          if (existingMap[key]) {
            flagged.push(existingMap[key]);
          } else {
            flagged.push({
              key, vertical: v, evalId: a.evalId, storeCode: a.storeCode,
              storeName: meta.storeName || a.storeName, unmapped: !!meta.unmapped, rom: meta.rom, sd: meta.sd, rm: meta.rm,
              date: a.date, score: a.score,
              stage: "flagged", // flagged -> ld_triggered -> rom_submitted -> hrbp_closed
              defaulters: [], actionNotes: "", history: [
                { stage: "flagged", at: new Date().toISOString(), by: "System", note: "Auto-flagged: score below 80" }
              ]
            });
          }
        }
      });
    });
    saveCases(flagged);
    return flagged;
  }

  function updateCase(key, patch) {
    const cases = getCases();
    const idx = cases.findIndex(c => c.key === key);
    if (idx === -1) return null;
    cases[idx] = Object.assign({}, cases[idx], patch);
    saveCases(cases);
    return cases[idx];
  }

  function addCaseHistory(key, entry) {
    const cases = getCases();
    const idx = cases.findIndex(c => c.key === key);
    if (idx === -1) return null;
    cases[idx].history = cases[idx].history || [];
    cases[idx].history.push(Object.assign({ at: new Date().toISOString() }, entry));
    saveCases(cases);
    return cases[idx];
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

  return {
    LS_KEYS, init, storeMeta, audits, sectionNames, inDateRange, scoreClass, scoreTag,
    mtd, avg, sectionAverages, filterAudits, uniqueValues, cascadingValues, latestPerStore,
    getCases, saveCases, caseKey, syncCasesFromAudits, updateCase, addCaseHistory,
    saveOverride, exportAllData, get STORES() { return STORES; }, get RETAIL() { return RETAIL; }, get PLAY() { return PLAY; }
  };
})();
