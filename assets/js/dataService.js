/* ==========================================================
   Hamleys Mystery Audit Intelligence
   Data Service — single source of truth
   Version 1.0
   ========================================================== */

"use strict";

/* ==========================================================
   GLOBAL DATASTORE
   ========================================================== */

const DataService = {
    storeMaster: [],
    retailAudits: [],
    playAudits: [],
    filteredData: [],
    contacts: {}
};

const STORAGE_KEY = "hamleysMysteryAuditData";

/* ==========================================================
   PERSISTENCE
   All uploaded data is persisted to localStorage so that
   Admin uploads are immediately available on every other
   page (RM / ROM / SD / Store / Overview).
   ========================================================== */

function persistData(){
    try{
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            storeMaster: DataService.storeMaster,
            retailAudits: DataService.retailAudits,
            playAudits: DataService.playAudits,
            contacts: DataService.contacts,
            savedOn: new Date().toISOString()
        }));
    }catch(err){
        console.error("Unable to persist data", err);
    }
}

function restoreData(){
    try{
        const raw = localStorage.getItem(STORAGE_KEY);
        if(!raw) return false;
        const parsed = JSON.parse(raw);
        DataService.storeMaster = parsed.storeMaster || [];
        DataService.retailAudits = (parsed.retailAudits || []).map(reviveAudit);
        DataService.playAudits = (parsed.playAudits || []).map(reviveAudit);
        DataService.contacts = parsed.contacts || {};
        return true;
    }catch(err){
        console.error("Unable to restore data", err);
        return false;
    }
}

function reviveAudit(audit){
    return { ...audit, auditDate: new Date(audit.auditDate) };
}

function clearAllData(){
    DataService.storeMaster = [];
    DataService.retailAudits = [];
    DataService.playAudits = [];
    localStorage.removeItem(STORAGE_KEY);
}

function getLastSavedTimestamp(){
    try{
        const raw = localStorage.getItem(STORAGE_KEY);
        if(!raw) return null;
        return JSON.parse(raw).savedOn || null;
    }catch(err){
        return null;
    }
}

/* ==========================================================
   LOADERS (called by parser.js)
   ========================================================== */

function loadBaseStoreData(rows, contacts){
    DataService.storeMaster = rows.map(row => ({
        storeName: String(row["Store Name"] || "").trim(),
        storeCode: String(row["Store Code"] || "").trim(),
        rom: String(row["ROM Name"] || "").trim(),
        sd: String(row["SD Name"] || "").trim(),
        rm: String(row["RM Name"] || "").trim()
    }));
    if(contacts){
        DataService.contacts = { ...DataService.contacts, ...contacts };
    }
    persistData();
}

function loadRetailAudits(rows){
    DataService.retailAudits = DataService.retailAudits.concat(rows);
    persistData();
}

function loadPlayAudits(rows){
    DataService.playAudits = DataService.playAudits.concat(rows);
    persistData();
}

function addAuditRecord(record){
    const list = record.business === "Play" ? DataService.playAudits : DataService.retailAudits;
    const exists = record.evaluationId && list.some(x => x.evaluationId === record.evaluationId);
    if(exists) return false;
    list.push(record);
    persistData();
    return true;
}

function importDatabase(json){
    try{
        const parsed = typeof json === "string" ? JSON.parse(json) : json;
        if(!parsed || !Array.isArray(parsed.baseStores)){
            throw new Error("File doesn't look like a Hamleys Mystery Audit database export.");
        }
        DataService.storeMaster = parsed.baseStores || [];
        DataService.retailAudits = (parsed.retailAudits || []).map(reviveAudit);
        DataService.playAudits = (parsed.playAudits || []).map(reviveAudit);
        DataService.contacts = parsed.contacts || {};
        persistData();
        return {
            stores: DataService.storeMaster.length,
            retailAudits: DataService.retailAudits.length,
            playAudits: DataService.playAudits.length
        };
    }catch(err){
        throw new Error("Import failed: " + err.message);
    }
}

/* ==========================================================
   STORE LOOKUP / ENRICHMENT
   ========================================================== */

function getStore(storeCode){
    return DataService.storeMaster.find(x => x.storeCode === storeCode);
}

function findStoreByName(name){
    return DataService.storeMaster.find(s => s.storeName === name);
}

function findStoreByCode(code){
    return DataService.storeMaster.find(s => s.storeCode === code);
}

function enrichAudit(audit){
    const store = getStore(audit.storeCode);
    if(!store) return audit;
    return { ...audit, rm: store.rm, rom: store.rom, sd: store.sd };
}

function getCurrentDataset(){
    const business = (typeof App !== "undefined" && App.business === "play") ? "play" : "retail";
    const dataset = business === "retail" ? DataService.retailAudits : DataService.playAudits;
    return dataset.map(enrichAudit);
}

/* ==========================================================
   FILTERS
   ========================================================== */

function filterByDate(data, fromDate, toDate){
    if(!fromDate || !toDate) return data;
    return data.filter(item => {
        const d = new Date(item.auditDate);
        return d >= fromDate && d <= toDate;
    });
}

function filterByField(data, field, value){
    if(!value || value === "All") return data;
    return data.filter(x => x[field] === value);
}

function getSectionScore(audit, section){
    if(!section || section === "All Sections") return audit.overall;
    if(!audit.sections) return audit.overall;
    const val = audit.sections[section];
    return typeof val === "number" ? val : audit.overall;
}

/* Generic filter pipeline. `filters` may include:
   from, to, rm, rom, sd, store, section */
function getFilteredDataset(filters = {}){
    let data = getCurrentDataset();
    if(filters.from && filters.to){
        data = filterByDate(data, filters.from, filters.to);
    }
    data = filterByField(data, "rm", filters.rm);
    data = filterByField(data, "rom", filters.rom);
    data = filterByField(data, "sd", filters.sd);
    data = filterByField(data, "storeName", filters.store);
    if(filters.section && filters.section !== "All Sections"){
        data = data.map(item => ({ ...item, overall: getSectionScore(item, filters.section) }));
    }
    if(filters.threshold === "below80"){
        data = data.filter(item => item.overall < 80);
    }else if(filters.threshold === "below60"){
        data = data.filter(item => item.overall < 60);
    }
    DataService.filteredData = data;
    return data;
}

/* ==========================================================
   KPI CALCULATIONS
   ========================================================== */

function calculateAverage(data){
    if(data.length === 0) return 0;
    const total = data.reduce((sum, item) => sum + item.overall, 0);
    return Number((total / data.length).toFixed(1));
}

function storesAudited(data){
    return new Set(data.map(x => x.storeCode)).size;
}

function below80(data){
    return data.filter(x => x.overall < 80).length;
}

function below60(data){
    return data.filter(x => x.overall < 60).length;
}

/* ==========================================================
   LATEST AUDIT PER STORE / TOP & BOTTOM
   ========================================================== */

function getLatestAuditPerStore(data){
    const map = {};
    data.forEach(item => {
        const key = item.storeCode;
        if(!map[key] || new Date(item.auditDate) > new Date(map[key].auditDate)){
            map[key] = item;
        }
    });
    return Object.values(map);
}

function getTopStores(data, limit = 10){
    return getLatestAuditPerStore(data).sort((a, b) => b.overall - a.overall).slice(0, limit);
}

function getBottomStores(data, limit = 10){
    return getLatestAuditPerStore(data).sort((a, b) => a.overall - b.overall).slice(0, limit);
}

function getStoreHistory(storeCode){
    return getCurrentDataset()
        .filter(x => x.storeCode === storeCode)
        .sort((a, b) => new Date(a.auditDate) - new Date(b.auditDate));
}

/* ==========================================================
   GROUP SUMMARY (used for Regional Performance chart etc.)
   ========================================================== */

function getGroupSummary(data, field){
    const summary = {};
    data.forEach(audit => {
        const key = audit[field] || "Unknown";
        if(!summary[key]) summary[key] = { name: key, total: 0, count: 0 };
        summary[key].total += audit.overall;
        summary[key].count++;
    });
    return Object.values(summary)
        .map(r => ({ name: r.name, average: Number((r.total / r.count).toFixed(1)), audits: r.count }))
        .sort((a, b) => b.average - a.average);
}

/* ==========================================================
   MONTHLY TREND
   ========================================================== */

function getMonthlyTrend(data){
    const buckets = {};
    data.forEach(item => {
        const d = new Date(item.auditDate);
        if(isNaN(d)) return;
        const key = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
        if(!buckets[key]) buckets[key] = { label: key, total: 0, count: 0, sortKey: d.getFullYear() * 12 + d.getMonth() };
        buckets[key].total += item.overall;
        buckets[key].count++;
    });
    return Object.values(buckets)
        .sort((a, b) => a.sortKey - b.sortKey)
        .map(b => ({ label: b.label, average: Number((b.total / b.count).toFixed(1)) }));
}

/* ==========================================================
   SECTION AVERAGES
   ========================================================== */

const SECTION_LABELS_RETAIL = [
    "H - Hamleys First Impression",
    "A - Approaching Right",
    "M - Meeting Thy Needs",
    "L - Lost In Demos",
    "E - Engaging Till Experience",
    "Y - You Come First",
    "S - Seeing Them Off"
];

const SECTION_LABELS_PLAY = [
    "Attraction",
    "Welcome",
    "Entry Assistance",
    "Safety",
    "Out For Play",
    "Magic Pillars",
    "Exit",
    "CSD Birthday Enquiry"
];

/* Audits store sections as { "<Section Name>": scorePercent }.
   Names are normalised (case + spacing) at parse time so lookups
   always match one of the two label lists above. */

function getSectionAverages(data){
    const labels = getSectionLabels();
    const totals = labels.map(() => ({ sum: 0, count: 0 }));
    data.forEach(item => {
        if(!item.sections) return;
        labels.forEach((label, i) => {
            const val = item.sections[label];
            if(typeof val === "number" && !isNaN(val)){
                totals[i].sum += val;
                totals[i].count++;
            }
        });
    });
    return totals.map(t => t.count ? Number((t.sum / t.count).toFixed(1)) : 0);
}

function getSectionLabels(){
    return (typeof App !== "undefined" && App.business === "play") ? SECTION_LABELS_PLAY : SECTION_LABELS_RETAIL;
}

/* ==========================================================
   SCORE DISTRIBUTION
   ========================================================== */

function getScoreDistribution(data){
    const buckets = { excellent: 0, good: 0, average: 0, poor: 0 };
    data.forEach(item => {
        if(item.overall >= 90) buckets.excellent++;
        else if(item.overall >= 80) buckets.good++;
        else if(item.overall >= 60) buckets.average++;
        else buckets.poor++;
    });
    return buckets;
}

/* ==========================================================
   DROPDOWN LISTS
   ========================================================== */

function uniqueSorted(values){
    return ["All", ...new Set(values.filter(Boolean))].sort((a, b) => a === "All" ? -1 : b === "All" ? 1 : a.localeCompare(b));
}

function getRMList(){ return uniqueSorted(DataService.storeMaster.map(x => x.rm)); }
function getROMList(){ return uniqueSorted(DataService.storeMaster.map(x => x.rom)); }
function getSDList(){ return uniqueSorted(DataService.storeMaster.map(x => x.sd)); }
function getStoreList(){ return uniqueSorted(DataService.storeMaster.map(x => x.storeName)); }

function getROMsUnderRM(rm){
    return uniqueSorted(DataService.storeMaster.filter(s => s.rm === rm).map(s => s.rom));
}
function getSDsUnderROM(rom){
    return uniqueSorted(DataService.storeMaster.filter(s => s.rom === rom).map(s => s.sd));
}
function getStoresUnder(field, value){
    return DataService.storeMaster.filter(s => s[field] === value);
}

/* ==========================================================
   AI INSIGHTS
   ========================================================== */

function generateInsights(data){
    const insights = [];
    if(!data.length){
        insights.push("No audit data available for the current filter selection.");
        return insights;
    }
    const avg = calculateAverage(data);
    if(avg >= 90){
        insights.push("Overall Mystery Audit performance is excellent and above the 90% benchmark.");
    }else if(avg >= 80){
        insights.push("Overall performance is stable but there is room for improvement to reach the 90% benchmark.");
    }else{
        insights.push("Average audit score is below the 80% target and requires operational focus.");
    }
    const sectionLabels = getSectionLabels();
    const sectionAverages = getSectionAverages(data);
    const weakestIndex = sectionAverages.reduce((minIdx, val, idx, arr) => val < arr[minIdx] ? idx : minIdx, 0);
    if(sectionAverages[weakestIndex] > 0){
        insights.push(`"${sectionLabels[weakestIndex]}" is the weakest section, averaging ${sectionAverages[weakestIndex]}%.`);
    }
    if(below80(data) > 0){
        insights.push(`${below80(data)} audit(s) are below the 80% intervention threshold.`);
    }
    if(below60(data) > 0){
        insights.push(`${below60(data)} audit(s) are below the 60% critical threshold and may require HR escalation.`);
    }
    return insights;
}

/* ==========================================================
   DASHBOARD SUMMARY (Overview / Executive page)
   ========================================================== */

function getDashboardSummary(filters = {}){
    const data = getFilteredDataset(filters);
    return {
        averageScore: calculateAverage(data),
        storesAudited: storesAudited(data),
        below80: below80(data),
        below60: below60(data),
        totalAudits: data.length,
        topStores: getTopStores(data, 10),
        bottomStores: getBottomStores(data, 10),
        regionalSummary: getGroupSummary(data, "rm"),
        monthlyTrend: getMonthlyTrend(data),
        sectionAverages: getSectionAverages(data),
        distribution: getScoreDistribution(data),
        insights: generateInsights(data),
        openCases: (typeof CasesAPI !== "undefined") ? CasesAPI.getOpenCases().length : 0
    };
}

/* ==========================================================
   SCOPED ENTITY SUMMARY
   Used by rm.html / rom.html / sd.html — same shape,
   different grouping field.
   scopeType: "rm" | "rom" | "sd"
   ========================================================== */

function getScopedSummary(scopeType, value, filters = {}){
    const scopedFilters = { ...filters, [scopeType]: value };
    const data = (value && value !== "All") ? getFilteredDataset(scopedFilters) : getFilteredDataset(filters);

    const storesInScope = (value && value !== "All") ? getStoresUnder(scopeType, value) : DataService.storeMaster;

    let childField = null;
    let childLabel = "";
    if(scopeType === "rm"){ childField = "rom"; childLabel = "ROM"; }
    if(scopeType === "rom"){ childField = "sd"; childLabel = "SD"; }
    if(scopeType === "sd"){ childField = "storeName"; childLabel = "Store"; }

    const childSummary = childField ? getGroupSummary(data, childField) : [];

    return {
        average: calculateAverage(data),
        storesAudited: storesAudited(data),
        below80: below80(data),
        below60: below60(data),
        totalAudits: data.length,
        totalStores: storesInScope.length,
        totalChildren: childField ? new Set(storesInScope.map(s => s[childField]).filter(Boolean)).size : 0,
        childLabel,
        childSummary,
        topStores: getTopStores(data, 10),
        bottomStores: getBottomStores(data, 10),
        monthlyTrend: getMonthlyTrend(data),
        sectionAverages: getSectionAverages(data),
        distribution: getScoreDistribution(data),
        insights: generateInsights(data),
        auditHistory: data.slice().sort((a, b) => new Date(b.auditDate) - new Date(a.auditDate)),
        openCases: (typeof CasesAPI !== "undefined")
            ? CasesAPI.getOpenCasesByField(scopeType, value).length
            : 0,
        casesInScope: (typeof CasesAPI !== "undefined")
            ? CasesAPI.getCasesByField(scopeType, value)
            : []
    };
}

function getCohortSummary(scopeType, filters = {}){
    const field = scopeType === "store" ? "storeName" : scopeType;
    const data = getFilteredDataset(filters);
    const entities = uniqueSorted(DataService.storeMaster.map(s => s[field])).filter(v => v !== "All");

    return entities.map(name => {
        const entityData = data.filter(item => item[field] === name);
        const storesInScope = scopeType === "store" ? getStoresUnder("storeName", name) : getStoresUnder(scopeType, name);
        return {
            name,
            average: calculateAverage(entityData),
            storesAudited: storesAudited(entityData),
            totalStores: storesInScope.length,
            below80: below80(entityData),
            below60: below60(entityData),
            totalAudits: entityData.length,
            openCases: (typeof CasesAPI !== "undefined") ? CasesAPI.getOpenCasesByField(field, name).length : 0
        };
    }).sort((a, b) => b.average - a.average);
}

function getDefaulterCandidates(threshold, filters = {}){
    const data = getFilteredDataset(filters);
    const latest = getLatestAuditPerStore(data);
    const cutoff = threshold === "below60" ? 60 : 80;
    const qualifying = latest.filter(a => a.overall < cutoff);

    const activeCases = (typeof CasesAPI !== "undefined") ? CasesAPI.getOpenActionProcesses() : [];
    const activeStoreCodes = new Set(activeCases.map(c => c.storeCode));

    return qualifying
        .map(audit => ({
            ...audit,
            hasActiveProcess: activeStoreCodes.has(audit.storeCode),
            daysSinceAudit: Math.floor((new Date() - new Date(audit.auditDate)) / 86400000)
        }))
        .sort((a, b) => a.overall - b.overall);
}

function getActionStatusList(threshold, filters = {}){
    const candidates = getDefaulterCandidates(threshold, filters);
    const cases = (typeof CasesAPI !== "undefined") ? CasesAPI.getActionProcesses() : [];

    return candidates.map(c => {
        const record = cases
            .filter(x => x.storeCode === c.storeCode)
            .sort((a, b) => new Date(b.ldStartedOn) - new Date(a.ldStartedOn))[0];

        if(!record){
            return {
                storeName: c.storeName, storeCode: c.storeCode, overall: c.overall,
                rm: c.rm, rom: c.rom, sd: c.sd,
                ldDone: false, romDone: false, hrDone: false,
                romDelayed: false, hrDelayed: false, status: "Not Started"
            };
        }

        const now = new Date();
        const msPerDay = 86400000;
        const romDelayed = !!record.ldStartedOn && !record.romSubmittedOn && Math.floor((now - new Date(record.ldStartedOn)) / msPerDay) > (typeof CasesAPI !== "undefined" ? CasesAPI.SLA_DAYS.rom : 3);
        const hrDelayed = !!record.romSubmittedOn && !record.hrClosedOn && Math.floor((now - new Date(record.romSubmittedOn)) / msPerDay) > (typeof CasesAPI !== "undefined" ? CasesAPI.SLA_DAYS.hr : 5);

        return {
            storeName: c.storeName, storeCode: c.storeCode, overall: c.overall,
            rm: c.rm, rom: c.rom, sd: c.sd,
            ldDone: !!record.ldStartedOn,
            romDone: !!record.romSubmittedOn,
            hrDone: !!record.hrClosedOn,
            romDelayed, hrDelayed,
            status: record.status
        };
    });
}

function getContactEmail(name){
    return DataService.contacts && DataService.contacts[name] ? DataService.contacts[name] : "";
}

/* ==========================================================
   STORE PROFILE
   ========================================================== */

function getStoreProfile(storeName){
    const store = findStoreByName(storeName);
    if(!store) return null;
    const history = getStoreHistory(store.storeCode);
    const sectionAverages = getSectionAverages(history);
    const sectionLabels = getSectionLabels();
    const ranked = sectionLabels.map((label, i) => ({ label, value: sectionAverages[i] })).sort((a, b) => b.value - a.value);
    return {
        ...store,
        history,
        latest: history.length ? history[history.length - 1] : null,
        average: calculateAverage(history),
        sectionAverages,
        strongest: ranked.slice(0, 3),
        weakest: ranked.slice(-3).reverse(),
        insights: generateInsights(history),
        cases: (typeof CasesAPI !== "undefined") ? CasesAPI.getCasesByStore(store.storeName) : []
    };
}

/* ==========================================================
   PUBLIC API
   ========================================================== */

window.DataServiceAPI = {
    // loaders
    loadBaseStoreData,
    loadRetailAudits,
    loadPlayAudits,
    addAuditRecord,
    // persistence
    persistData,
    restoreData,
    clearAllData,
    importDatabase,
    getLastSavedTimestamp,
    // datasets
    getCurrentDataset,
    getFilteredDataset,
    getSectionScore,
    // summaries
    getDashboardSummary,
    getScopedSummary,
    getCohortSummary,
    getStoreProfile,
    getStoreHistory,
    getGroupSummary,
    getMonthlyTrend,
    getSectionAverages,
    getSectionLabels,
    getScoreDistribution,
    getTopStores,
    getBottomStores,
    generateInsights,
    getDefaulterCandidates,
    getActionStatusList,
    getContactEmail,
    // dropdowns
    getRMList,
    getROMList,
    getSDList,
    getStoreList,
    getROMsUnderRM,
    getSDsUnderROM,
    getStoresUnder,
    // lookups
    findStoreByCode,
    findStoreByName,
    getStore
};

/* ==========================================================
   INITIALISE — restore persisted data immediately
   ========================================================== */

restoreData();
console.log("Hamleys Data Service Loaded");
