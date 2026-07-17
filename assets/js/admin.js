/* ==========================================================
   Hamleys Mystery Audit Intelligence
   Admin Portal Controller
   Manages uploads only:
     - Base Store Master (Excel)
     - Retail / PLAY Audit Reports (PDF, batch)
   ========================================================== */

"use strict";

const Admin = {
    uploadHistory: []
};

const HISTORY_KEY = "hamleysUploadHistory";

document.addEventListener("DOMContentLoaded", () => {
    bindButtons();
    loadHistory();
    updateKPIs();
    refreshPreview();
});

/* ==========================================================
   BUTTON BINDINGS
   ========================================================== */

function bindButtons(){
    document.getElementById("uploadBaseStore")?.addEventListener("click", uploadBaseStore);
    document.getElementById("uploadAuditPdf")?.addEventListener("click", uploadAuditPdfs);
    document.getElementById("uploadHistoricalRetail")?.addEventListener("click", () => uploadHistorical("retail"));
    document.getElementById("uploadHistoricalPlay")?.addEventListener("click", () => uploadHistorical("play"));
    document.getElementById("refreshPreview")?.addEventListener("click", refreshPreview);
    document.getElementById("clearLogs")?.addEventListener("click", clearLogs);
    document.getElementById("exportDatabase")?.addEventListener("click", exportDatabase);
    document.getElementById("rebuildIndexes")?.addEventListener("click", rebuildIndexes);
    document.getElementById("refreshDashboardData")?.addEventListener("click", () => {
        updateKPIs();
        AppAPI.renderDataStatusBadge();
        refreshPreview();
        showToast("Dashboard data refreshed.");
    });
}

/* ==========================================================
   HISTORICAL BULK UPLOAD (Retail / PLAY)
   ========================================================== */

async function uploadHistorical(business){
    const inputId = business === "play" ? "historicalPlayUpload" : "historicalRetailUpload";
    const statusId = business === "play" ? "historicalPlayStatus" : "historicalRetailStatus";
    const input = document.getElementById(inputId);
    const status = document.getElementById(statusId);
    const file = input?.files?.[0];

    if(!file){
        showToast("Please select a historical audit Excel file.", "warning");
        return;
    }

    setStatus(status, "Processing...", "pending");
    try{
        const results = business === "play"
            ? await ParserAPI.importHistoricalPlay(file)
            : await ParserAPI.importHistoricalRetail(file);

        addHistory(`Historical ${business === "play" ? "PLAY" : "Retail"} Import`, file.name, `${results.added} added, ${results.duplicates} duplicate`);
        setStatus(status, "Completed", "success");
        showToast(`${results.added} historical audits imported (${results.duplicates} duplicates skipped).`);
        updateKPIs();
        AppAPI.renderDataStatusBadge();
        refreshPreview();
        input.value = "";
    }catch(err){
        console.error(err);
        setStatus(status, "Failed", "error");
        showToast(err.message, "error");
    }
}

/* ==========================================================
   BASE STORE MASTER UPLOAD
   ========================================================== */

async function uploadBaseStore(){
    const input = document.getElementById("baseStoreUpload");
    const file = input?.files?.[0];
    const status = document.getElementById("baseStatus");

    if(!file){
        showToast("Please select a Base Store Master file.", "warning");
        return;
    }

    setStatus(status, "Processing...", "pending");
    try{
        const rows = await ParserAPI.parseBaseStoreFile(file);
        if(!rows.length){
            throw new Error("No valid rows found. Check column headers: Store Name, Store Code, ROM Name, SD Name, RM Name.");
        }
        DataServiceAPI.loadBaseStoreData(rows);
        addHistory("Base Store Master", file.name, `${rows.length} stores loaded`);

        const missingRM = rows.filter(r => !r.rm).length;
        const missingROM = rows.filter(r => !r.rom).length;
        const missingSD = rows.filter(r => !r.sd).length;

        if(missingRM === rows.length || missingROM === rows.length || missingSD === rows.length){
            setStatus(status, "Loaded with warnings", "warning");
            showToast(
                `${rows.length} stores loaded, but RM/ROM/SD columns weren't recognised in every row. ` +
                `Check your file's headers are exactly "RM Name", "ROM Name", "SD Name" (or "RM"/"ROM"/"SD").`,
                "warning"
            );
        }else{
            setStatus(status, "Completed", "success");
            showToast(`Base Store Master updated — ${rows.length} stores (${missingRM} missing RM, ${missingROM} missing ROM, ${missingSD} missing SD).`);
        }

        updateKPIs();
        AppAPI.renderDataStatusBadge();
        refreshPreview();
        input.value = "";
    }catch(err){
        console.error(err);
        setStatus(status, "Failed", "error");
        showToast(err.message, "error");
    }
}

/* ==========================================================
   AUDIT PDF UPLOAD (batch, Retail or PLAY auto-detected)
   ========================================================== */

async function uploadAuditPdfs(){
    const input = document.getElementById("auditPdfUpload");
    const files = input?.files;
    const status = document.getElementById("pdfStatus");

    if(!files || !files.length){
        showToast("Please select one or more audit report PDFs.", "warning");
        return;
    }

    setStatus(status, `Processing ${files.length} file(s)...`, "pending");
    const results = await ParserAPI.parseAuditPdfBatch(files);

    results.added.forEach(record => {
        addHistory(`${record.business} Audit PDF`, record.sourceFile, `${record.storeName || record.storeCode} — ${record.overall}%`);
    });
    results.duplicates.forEach(name => {
        addHistory("Audit PDF (skipped)", name, "Duplicate — already uploaded");
    });
    results.failed.forEach(item => {
        addHistory("Audit PDF (failed)", item.name, item.error);
    });

    const summary = `${results.added.length} added, ${results.duplicates.length} duplicate, ${results.failed.length} failed`;
    if(results.failed.length && !results.added.length){
        setStatus(status, "Failed", "error");
        showToast(summary, "error");
    }else{
        setStatus(status, "Completed", "success");
        showToast(summary, results.failed.length ? "warning" : "success");
    }

    updateKPIs();
        AppAPI.renderDataStatusBadge();
    refreshPreview();
    input.value = "";
}

/* ==========================================================
   PREVIEW TABLE (recent audits)
   ========================================================== */

function refreshPreview(){
    const tbody = document.getElementById("previewTable");
    if(!tbody) return;
    tbody.innerHTML = "";

    const combined = DataService.retailAudits.concat(DataService.playAudits)
        .slice()
        .sort((a, b) => new Date(b.auditDate) - new Date(a.auditDate))
        .slice(0, 50);

    combined.forEach(audit => {
        const store = DataServiceAPI.findStoreByCode(audit.storeCode);
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${audit.storeCode}</td>
            <td>${audit.storeName || (store ? store.storeName : "-")}</td>
            <td>${store ? store.rm : "-"}</td>
            <td>${store ? store.rom : "-"}</td>
            <td>${store ? store.sd : "-"}</td>
            <td>${audit.business}</td>
            <td>${new Date(audit.auditDate).toLocaleDateString("en-IN")}</td>
            <td>${audit.overall}%</td>
        `;
        tbody.appendChild(row);
    });
}

/* ==========================================================
   UPLOAD HISTORY
   ========================================================== */

function addHistory(type, file, detail){
    Admin.uploadHistory.unshift({
        date: new Date(),
        type,
        file,
        detail
    });
    saveHistory();
    renderHistory();
}

function renderHistory(){
    const tbody = document.getElementById("uploadHistoryTable");
    if(!tbody) return;
    tbody.innerHTML = "";
    Admin.uploadHistory.forEach(item => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${formatDateTime(item.date)}</td>
            <td>${item.type}</td>
            <td>${item.file}</td>
            <td>${item.detail}</td>
        `;
        tbody.appendChild(row);
    });
}

function formatDateTime(date){
    return new Date(date).toLocaleString("en-IN");
}

function saveHistory(){
    localStorage.setItem(HISTORY_KEY, JSON.stringify(Admin.uploadHistory));
}

function loadHistory(){
    const raw = localStorage.getItem(HISTORY_KEY);
    if(raw){
        try{ Admin.uploadHistory = JSON.parse(raw); }catch(e){ Admin.uploadHistory = []; }
    }
    renderHistory();
}

function clearLogs(){
    if(!confirm("Clear upload history? This does not delete audit data.")) return;
    Admin.uploadHistory = [];
    saveHistory();
    renderHistory();
    showToast("Upload history cleared.");
}

/* ==========================================================
   KPIs
   ========================================================== */

function updateKPIs(){
    setText("storeCount", DataService.storeMaster.length);
    setText("retailCount", DataService.retailAudits.length);
    setText("playCount", DataService.playAudits.length);
    setText("totalAuditCount", DataService.retailAudits.length + DataService.playAudits.length);
    setText("lastUpload", Admin.uploadHistory.length ? formatDateTime(Admin.uploadHistory[0].date) : "—");
}

function setText(id, value){
    const el = document.getElementById(id);
    if(el) el.textContent = value;
}

function setStatus(el, text, state){
    if(!el) return;
    const map = { pending: "info", success: "success", error: "danger", warning: "warning" };
    el.textContent = text;
    el.className = "status " + (map[state] || "info");
}

/* ==========================================================
   DATABASE EXPORT / REBUILD
   ========================================================== */

function exportDatabase(){
    const database = {
        generatedOn: new Date(),
        baseStores: DataService.storeMaster,
        retailAudits: DataService.retailAudits,
        playAudits: DataService.playAudits,
        uploadHistory: Admin.uploadHistory
    };
    const blob = new Blob([JSON.stringify(database, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "hamleys_mystery_audit_database.json";
    link.click();
    showToast("Database exported.");
}

function rebuildIndexes(){
    // Re-enrich every audit against the latest store master and re-persist.
    DataServiceAPI.persistData();
    refreshPreview();
    updateKPIs();
    showToast("Store mappings rebuilt.");
}

/* ==========================================================
   PUBLIC API
   ========================================================== */

window.AdminAPI = {
    uploadBaseStore,
    uploadAuditPdfs,
    refreshPreview,
    updateKPIs,
    exportDatabase,
    clearLogs
};

console.log("Admin Controller Loaded");
