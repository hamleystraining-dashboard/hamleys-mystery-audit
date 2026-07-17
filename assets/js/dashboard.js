/* ==========================================================
   Hamleys Mystery Audit Intelligence
   Dashboard Controller
   Reads filters -> calls DataService -> renders KPIs,
   charts and tables. Contains no chart or data logic of
   its own (see charts.js / dataService.js).

   Every page declares a small PAGE_CONFIG object before
   this script loads. Example (rm.html):

   window.PAGE_CONFIG = {
       scope: "rm",
       prefix: "rm",
       selectId: "rmFilter"
   };
   ========================================================== */

"use strict";

const Dashboard = {
    config: null,
    filters: { from: null, to: null, section: "All Sections" }
};

document.addEventListener("DOMContentLoaded", () => {
    Dashboard.config = window.PAGE_CONFIG || { scope: "overview", prefix: "", selectId: null };
    initialiseDashboard();
});

/* ==========================================================
   INITIALISE
   ========================================================== */

function initialiseDashboard(){
    initialiseFilters();
    loadDropdowns();
    refreshDashboard();
}

function initialiseFilters(){
    ["fromDate", "toDate", "sectionFilter", "thresholdFilter"].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener("change", refreshDashboard);
    });
    if(Dashboard.config.selectId){
        const el = document.getElementById(Dashboard.config.selectId);
        if(el) el.addEventListener("change", refreshDashboard);
    }
    document.getElementById("retailToggle")?.addEventListener("click", () => setTimeout(refreshDashboard, 30));
    document.getElementById("playToggle")?.addEventListener("click", () => setTimeout(refreshDashboard, 30));
}

function loadDropdowns(){
    if(typeof DataServiceAPI === "undefined") return;

    if(document.getElementById("rmFilter") && Dashboard.config.selectId === "rmFilter"){
        loadSelect("rmFilter", DataServiceAPI.getRMList());
    }
    if(document.getElementById("romFilter") && Dashboard.config.selectId === "romFilter"){
        loadSelect("romFilter", DataServiceAPI.getROMList());
    }
    if(document.getElementById("sdFilter") && Dashboard.config.selectId === "sdFilter"){
        loadSelect("sdFilter", DataServiceAPI.getSDList());
    }
    if(document.getElementById("storeFilter")){
        loadSelect("storeFilter", DataServiceAPI.getStoreList());
    }

    // Overview page has the full filter rail
    loadSelect("rmFilterOverview", DataServiceAPI.getRMList());
    loadSelect("romFilterOverview", DataServiceAPI.getROMList());
    loadSelect("sdFilterOverview", DataServiceAPI.getSDList());
    loadSelect("storeFilterOverview", DataServiceAPI.getStoreList());

    updateSectionOptions();
}

function loadSelect(id, data){
    const select = document.getElementById(id);
    if(!select || !data) return;
    const previous = select.value;
    select.innerHTML = "";
    data.forEach(item => {
        const option = document.createElement("option");
        option.value = item;
        option.text = item;
        select.appendChild(option);
    });
    if(data.includes(previous)) select.value = previous;
}

function updateSectionOptions(){
    const section = document.getElementById("sectionFilter");
    if(!section || typeof DataServiceAPI === "undefined") return;
    const labels = ["All Sections", ...DataServiceAPI.getSectionLabels()];
    const previous = section.value;
    section.innerHTML = "";
    labels.forEach(item => {
        const option = document.createElement("option");
        option.value = item;
        option.text = item;
        section.appendChild(option);
    });
    if(labels.includes(previous)) section.value = previous;
}

/* ==========================================================
   COLLECT FILTERS
   ========================================================== */

function collectFilters(){
    Dashboard.filters.from = valueAsDate("fromDate");
    Dashboard.filters.to = valueAsDate("toDate");
    Dashboard.filters.section = value("sectionFilter") || "All Sections";

    // Overview-only cross filters
    Dashboard.filters.rm = value("rmFilterOverview");
    Dashboard.filters.rom = value("romFilterOverview");
    Dashboard.filters.sd = value("sdFilterOverview");
    Dashboard.filters.store = value("storeFilterOverview");
    Dashboard.filters.threshold = value("thresholdFilter");
}

/* ==========================================================
   REFRESH — main entry point
   ========================================================== */

function refreshDashboard(){
    if(typeof DataServiceAPI === "undefined"){
        console.warn("DataServiceAPI not ready");
        return;
    }
    collectFilters();

    switch(Dashboard.config.scope){
        case "rm":
        case "rom":
        case "sd":
            renderScopedPage(Dashboard.config.scope, Dashboard.config.prefix);
            break;
        case "store":
            renderStorePage();
            break;
        default:
            renderOverviewPage();
    }

    if(typeof ChartsAPI !== "undefined") ChartsAPI.resize();
}

/* ==========================================================
   OVERVIEW PAGE
   ========================================================== */

function renderOverviewPage(){
    const summary = DataServiceAPI.getDashboardSummary(Dashboard.filters);

    setText("overallIndiaScore", summary.averageScore + "%");
    setText("avgScore", summary.averageScore);
    setText("storesAudited", summary.storesAudited);
    setText("below80", summary.below80);
    setText("below60", summary.below60);
    setText("openCases", summary.openCases);

    renderInsights("aiInsights", summary.insights);
    renderStoreTable("topStoresTable", summary.topStores.slice(0, 5));
    renderStoreTable("bottomStoresTable", summary.bottomStores.slice(0, 5));

    if(typeof ChartsAPI === "undefined") return;
    ChartsAPI.renderTrendChart("indiaTrendChart", summary.monthlyTrend.map(m => ({ label: m.label, value: m.average })));
    ChartsAPI.renderSectionChart("sectionChart", DataServiceAPI.getSectionLabels(), summary.sectionAverages);
}

/* ==========================================================
   SCOPED PAGE (RM / ROM / SD)
   ========================================================== */

function renderScopedPage(scope, prefix){
    const selectId = Dashboard.config.selectId;
    const selectedValue = value(selectId);
    const summary = DataServiceAPI.getScopedSummary(scope, selectedValue, Dashboard.filters);
    const cohort = DataServiceAPI.getCohortSummary(scope, Dashboard.filters);

    renderCohortTable(prefix + "CohortTable", cohort, selectId, selectedValue);

    setText(prefix + "AverageScore", summary.average + "%");
    setText(prefix + "StoresAudited", summary.storesAudited);
    setText(prefix + "Below80", summary.below80);
    setText(prefix + "Below60", summary.below60);
    setText(prefix + "OpenCases", summary.openCases);

    setText(prefix + "Name", selectedValue && selectedValue !== "All" ? selectedValue : "All " + labelForScope(scope));
    setText(prefix + "Region", selectedValue && selectedValue !== "All" ? selectedValue : "Pan India");
    setText(prefix + "Total" + summary.childLabel + "s", summary.totalChildren);
    setText(prefix + "TotalStores", summary.totalStores);
    setText(prefix + "Average", summary.average + "%");

    renderInsights(prefix + "Insights", summary.insights);
    renderStoreTable(prefix + "TopStores", summary.topStores);
    renderStoreTable(prefix + "BottomStores", summary.bottomStores);
    renderGroupTable(prefix + (scope === "rm" ? "ROMTable" : scope === "rom" ? "SDTable" : "StoreListTable"), summary.childSummary);
    renderCasesTable(prefix + "CasesTable", summary.casesInScope);
    renderAuditHistoryTable(prefix + "AuditHistory", summary.auditHistory);

    if(typeof ChartsAPI === "undefined") return;
    ChartsAPI.renderTrendChart(prefix + "TrendChart", summary.monthlyTrend.map(m => ({ label: m.label, value: m.average })));
    ChartsAPI.renderSectionChart(prefix + "SectionChart", DataServiceAPI.getSectionLabels(), summary.sectionAverages);
    ChartsAPI.renderDistributionChart(prefix + "DistributionChart", summary.distribution);
    ChartsAPI.renderTrendChart(prefix + "MonthlyTrendChart", summary.monthlyTrend.map(m => ({ label: m.label, value: m.average })), { color: ChartsAPI.theme.blue });
}

function labelForScope(scope){
    return scope === "rm" ? "Regional Managers" : scope === "rom" ? "Regional Ops Managers" : "Store Directors";
}

/* ==========================================================
   STORE PAGE
   ========================================================== */

function renderStorePage(){
    const storeName = value("storeFilter");
    const cohort = DataServiceAPI.getCohortSummary("store", Dashboard.filters);
    renderCohortTable("storeCohortTable", cohort, "storeFilter", storeName);

    if(!storeName || storeName === "All"){
        return;
    }
    const profile = DataServiceAPI.getStoreProfile(storeName);
    if(!profile) return;

    setText("storeName", profile.storeName);
    setText("storeCode", profile.storeCode);
    setText("storeRM", profile.rm || "-");
    setText("storeROM", profile.rom || "-");
    setText("storeSD", profile.sd || "-");
    setText("storeAverage", profile.average + "%");
    setText("storeLatestScore", profile.latest ? profile.latest.overall + "%" : "--");
    setText("storeLatestDate", profile.latest ? new Date(profile.latest.auditDate).toLocaleDateString("en-IN") : "--");
    setText("storeOpenCases", profile.cases.filter(c => c.status === "Open").length);

    renderInsights("storeInsights", profile.insights);
    renderList("storeStrongest", profile.strongest, item => `${item.label} — ${item.value}%`);
    renderList("storeWeakest", profile.weakest, item => `${item.label} — ${item.value}%`);
    renderAuditHistoryTable("storeAuditHistory", profile.history.slice().reverse());
    renderCasesTable("storeHRTable", profile.cases);
    renderTimeline("storeTimeline", profile.history);

    if(typeof ChartsAPI === "undefined") return;
    ChartsAPI.renderTrendChart("storeTrendChart", profile.history.map(h => ({ label: ChartsAPI.formatDate(h.auditDate), value: h.overall })));
    ChartsAPI.renderSectionChart("storeSectionChart", DataServiceAPI.getSectionLabels(), profile.sectionAverages);
}

/* ==========================================================
   RENDER HELPERS
   ========================================================== */

function renderCohortTable(id, cohort, selectId, selectedValue){
    const table = document.getElementById(id);
    if(!table) return;
    table.innerHTML = `<tr><th>#</th><th>Name</th><th>Stores</th><th>Audits</th><th>Average</th><th>Below 80</th><th>Below 60</th><th>Open Cases</th></tr>`;
    cohort.forEach((item, index) => {
        const row = document.createElement("tr");
        row.style.cursor = "pointer";
        if(selectedValue && item.name === selectedValue) row.classList.add("cohort-row-active");
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${escapeHtml(item.name)}</strong></td>
            <td>${item.storesAudited}/${item.totalStores}</td>
            <td>${item.totalAudits}</td>
            <td>${item.average}%</td>
            <td>${item.below80}</td>
            <td>${item.below60}</td>
            <td>${item.openCases}</td>
        `;
        row.addEventListener("click", () => {
            const select = document.getElementById(selectId);
            if(select){
                select.value = item.name;
                refreshDashboard();
                select.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        });
        table.appendChild(row);
    });
}

function renderInsights(containerId, insights){
    const container = document.getElementById(containerId);
    if(!container) return;
    container.innerHTML = "";
    (insights || []).forEach(text => {
        const card = document.createElement("div");
        card.className = "insight-card";
        card.innerHTML = `<h4>Insight</h4><p>${escapeHtml(text)}</p>`;
        container.appendChild(card);
    });
}

function renderStoreTable(id, data){
    const table = document.getElementById(id);
    if(!table) return;
    table.innerHTML = `<tr><th>Store</th><th>RM</th><th>ROM</th><th>SD</th><th>Score</th></tr>`;
    (data || []).forEach(item => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${escapeHtml(item.storeName)}</td>
            <td>${escapeHtml(item.rm || "-")}</td>
            <td>${escapeHtml(item.rom || "-")}</td>
            <td>${escapeHtml(item.sd || "-")}</td>
            <td>${item.overall}%</td>
        `;
        table.appendChild(row);
    });
}

function renderGroupTable(id, data){
    const table = document.getElementById(id);
    if(!table) return;
    table.innerHTML = `<tr><th>Name</th><th>Audits</th><th>Average Score</th></tr>`;
    (data || []).forEach(item => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${escapeHtml(item.name)}</td>
            <td>${item.audits}</td>
            <td>${item.average}%</td>
        `;
        table.appendChild(row);
    });
}

function renderCasesTable(id, data){
    const table = document.getElementById(id);
    if(!table) return;
    table.innerHTML = `<tr><th>Store</th><th>Employee</th><th>HR Action</th><th>Status</th><th>Created</th></tr>`;
    const statusClass = { Open: "danger", "In Progress": "warning", Closed: "success" };
    (data || []).forEach(item => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${escapeHtml(item.storeName || "-")}</td>
            <td>${escapeHtml(item.employeeName || "-")}</td>
            <td>${escapeHtml(item.hrAction || "-")}</td>
            <td><span class="status ${statusClass[item.status] || "info"}">${escapeHtml(item.status || "-")}</span></td>
            <td>${item.createdOn ? new Date(item.createdOn).toLocaleDateString("en-IN") : "-"}</td>
        `;
        table.appendChild(row);
    });
}

function renderAuditHistoryTable(id, data){
    const table = document.getElementById(id);
    if(!table) return;
    table.innerHTML = `<tr><th>Date</th><th>Store</th><th>Score</th></tr>`;
    (data || []).forEach(item => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${new Date(item.auditDate).toLocaleDateString("en-IN")}</td>
            <td>${escapeHtml(item.storeName)}</td>
            <td>${item.overall}%</td>
        `;
        table.appendChild(row);
    });
}

function renderList(id, items, formatter){
    const container = document.getElementById(id);
    if(!container) return;
    container.innerHTML = "";
    if(!items || !items.length){
        container.innerHTML = "<li>No data available</li>";
        return;
    }
    items.forEach(item => {
        const li = document.createElement("li");
        li.textContent = formatter(item);
        container.appendChild(li);
    });
}

function renderTimeline(id, history){
    const container = document.getElementById(id);
    if(!container) return;
    container.innerHTML = "";
    if(!history || !history.length){
        container.innerHTML = "<div class='timeline-empty'>No audit history yet.</div>";
        return;
    }
    history.forEach(item => {
        const node = document.createElement("div");
        node.className = "timeline-item";
        node.innerHTML = `
            <div class="timeline-dot"></div>
            <div class="timeline-content">
                <strong>${new Date(item.auditDate).toLocaleDateString("en-IN")}</strong>
                <span>${item.overall}% overall score</span>
            </div>
        `;
        container.appendChild(node);
    });
}

/* ==========================================================
   UTILITIES
   ========================================================== */

function value(id){
    const el = document.getElementById(id);
    return el ? el.value : "";
}

function valueAsDate(id){
    const el = document.getElementById(id);
    return el ? el.valueAsDate : null;
}

function setText(id, val){
    const el = document.getElementById(id);
    if(el) el.textContent = val;
}

function escapeHtml(str){
    if(str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/* ==========================================================
   RESET FILTERS
   ========================================================== */

function resetFilters(){
    ["rmFilterOverview","romFilterOverview","sdFilterOverview","storeFilterOverview","sectionFilter"].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.selectedIndex = 0;
    });
    refreshDashboard();
}

/* ==========================================================
   PUBLIC API
   ========================================================== */

window.DashboardAPI = {
    refresh: refreshDashboard,
    resetFilters
};

console.log("Dashboard Controller Loaded");
