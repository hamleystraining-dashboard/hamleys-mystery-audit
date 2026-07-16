/* ==========================================================
   Hamleys Mystery Audit Intelligence
   Dashboard Controller v0.9.0
========================================================== */

"use strict";

/* ==========================================================
   DASHBOARD STATE
========================================================== */

const Dashboard={

    page:

        window.location.pathname
        .split("/")
        .pop()
        .replace(".html","")
        ||"index",

    filters:{

        from:null,

        to:null,

        rm:"All",

        rom:"All",

        sd:"All",

        store:"All",

        section:"All Sections"

    }

};

/* ==========================================================
   INITIALISE
========================================================== */

document.addEventListener(

    "DOMContentLoaded",

    initialiseDashboard

);

function initialiseDashboard(){

    bindFilters();

    loadDropdowns();

    refreshDashboard();

}

/* ==========================================================
   FILTER EVENTS
========================================================== */

function bindFilters(){

    [

        "fromDate",

        "toDate",

        "rmFilter",

        "romFilter",

        "sdFilter",

        "storeFilter",

        "sectionFilter"

    ].forEach(id=>{

        const el=document.getElementById(id);

        if(el){

            el.addEventListener(

                "change",

                refreshDashboard

            );

        }

    });

}

/* ==========================================================
   LOAD DROPDOWNS
========================================================== */

function loadDropdowns(){

    if(

        typeof DataServiceAPI==="undefined"

    ){

        console.warn(

            "DataServiceAPI unavailable"

        );

        return;

    }

    loadSelect(

        "rmFilter",

        DataServiceAPI.getRMList()

    );

    loadSelect(

        "romFilter",

        DataServiceAPI.getROMList()

    );

    loadSelect(

        "sdFilter",

        DataServiceAPI.getSDList()

    );

    loadSelect(

        "storeFilter",

        DataServiceAPI.getStoreList()

    );

    if(

        typeof updateSectionNames==="function"

    ){

        updateSectionNames();

    }

}

function loadSelect(

    id,

    values=[]

){

    const select=

        document.getElementById(id);

    if(!select) return;

    select.innerHTML="";

    values.forEach(value=>{

        const option=

            document.createElement("option");

        option.value=value;

        option.textContent=value;

        select.appendChild(option);

    });

}

/* ==========================================================
   REFRESH ENGINE
========================================================== */

function refreshDashboard(){

    if(

        typeof DataServiceAPI==="undefined"

    ){

        return;

    }

    collectFilters();

    const summary=

        DataServiceAPI.getDashboardSummary(

            Dashboard.filters

        );

    if(!summary){

        return;

    }

    renderKPIs(summary);

    renderInsights(summary);

    renderTables(summary);

    renderCharts(summary);

}
/* ==========================================================
   COLLECT FILTERS
========================================================== */

function collectFilters(){

    Dashboard.filters.from =

        valueAsDate("fromDate");

    Dashboard.filters.to =

        valueAsDate("toDate");

    Dashboard.filters.rm =

        value("rmFilter");

    Dashboard.filters.rom =

        value("romFilter");

    Dashboard.filters.sd =

        value("sdFilter");

    Dashboard.filters.store =

        value("storeFilter");

    Dashboard.filters.section =

        value("sectionFilter");

}

/* ==========================================================
   KPI CARDS
========================================================== */

function renderKPIs(summary){

    setText("overallIndiaScore", summary.averageScore + "%");
    setText("avgScore", summary.averageScore + "%");
    setText("storesAudited", summary.storesAudited);
    setText("below80", summary.below80);
    setText("below60", summary.below60);
    setText("openCases", summary.openCases || 0);

}

/* ==========================================================
   AI INSIGHTS
========================================================== */

function renderInsights(summary){

    const container =
        document.getElementById("aiInsights");

    if(!container) return;

    container.innerHTML = "";

    const insights =
        DataServiceAPI.generateInsights(
            DataServiceAPI.getFilteredDataset(
                Dashboard.filters
            )
        );

    insights.forEach(text=>{

        const card =
            document.createElement("div");

        card.className = "insight-card";

        card.innerHTML = `
            <h4>Insight</h4>
            <p>${text}</p>
        `;

        container.appendChild(card);

    });

}

/* ==========================================================
   TABLES
========================================================== */

function renderTables(summary){

    renderTable(
        "topStoresTable",
        summary.topStores || []
    );

    renderTable(
        "bottomStoresTable",
        summary.bottomStores || []
    );

}

function renderTable(id,data){

    const tbody =
        document.getElementById(id);

    if(!tbody) return;

    tbody.innerHTML = "";

    if(data.length===0){

        tbody.innerHTML =
        `<tr>
            <td colspan="5">No data available</td>
        </tr>`;

        return;

    }

    data.forEach(store=>{

        const row =
            document.createElement("tr");

        row.innerHTML = `

            <td>${store.storeName || "-"}</td>
            <td>${store.rm || "-"}</td>
            <td>${store.rom || "-"}</td>
            <td>${store.sd || "-"}</td>
            <td>${store.overall || 0}%</td>

        `;

        tbody.appendChild(row);

    });

}

/* ==========================================================
   CHARTS
========================================================== */

function renderCharts(summary){

    if(typeof ChartsAPI==="undefined") return;

    ChartsAPI.renderIndiaTrend(
        Dashboard.filters
    );

    ChartsAPI.renderRegionalSummary(
        summary.regionalSummary || []
    );

    ChartsAPI.renderScoreDistribution(
        DataServiceAPI.getFilteredDataset(
            Dashboard.filters
        )
    );

    ChartsAPI.renderSectionPerformance(
        DataServiceAPI.getFilteredDataset(
            Dashboard.filters
        )
    );

}

/* ==========================================================
   STORE PROFILE
========================================================== */

function loadStoreProfile(storeCode){

    const profile =
        DataServiceAPI.getStoreProfile(storeCode);

    if(!profile) return;

    setText("profileStoreName", profile.storeName);
    setText("profileRM", profile.rm);
    setText("profileROM", profile.rom);
    setText("profileSD", profile.sd);

    if(profile.latest){

        setText(
            "profileScore",
            profile.latest.overall + "%"
        );

    }

}
/* ==========================================================
   UTILITIES
========================================================== */

function value(id){

    const el=document.getElementById(id);

    return el ? el.value : "All";

}

function valueAsDate(id){

    const el=document.getElementById(id);

    return el ? el.valueAsDate : null;

}

function setText(id,value){

    const el=document.getElementById(id);

    if(el){

        el.textContent=value;

    }

}

/* ==========================================================
   COLLECT FILTERS
========================================================== */

function collectFilters(){

    Dashboard.filters.from=valueAsDate("fromDate");

    Dashboard.filters.to=valueAsDate("toDate");

    Dashboard.filters.rm=value("rmFilter");

    Dashboard.filters.rom=value("romFilter");

    Dashboard.filters.sd=value("sdFilter");

    Dashboard.filters.store=value("storeFilter");

    Dashboard.filters.section=value("sectionFilter");

}

/* ==========================================================
   RESET FILTERS
========================================================== */

function resetFilters(){

    [

        "rmFilter",

        "romFilter",

        "sdFilter",

        "storeFilter",

        "sectionFilter"

    ].forEach(id=>{

        const el=document.getElementById(id);

        if(el){

            el.selectedIndex=0;

        }

    });

    refreshDashboard();

}

/* ==========================================================
   BUSINESS TOGGLE
========================================================== */

document.getElementById("retailToggle")
?.addEventListener(

    "click",

    refreshDashboard

);

document.getElementById("playToggle")
?.addEventListener(

    "click",

    refreshDashboard

);

/* ==========================================================
   WINDOW RESIZE
========================================================== */

window.addEventListener(

    "resize",

    ()=>{

        if(

            window.ChartsAPI &&
            ChartsAPI.resize

        ){

            ChartsAPI.resize();

        }

    }

);

/* ==========================================================
   PUBLIC API
========================================================== */

window.DashboardAPI={

    refresh:refreshDashboard,

    reload:refreshDashboard,

    resetFilters,

    loadStoreProfile,

    getFilters(){

        return Dashboard.filters;

    }

};

/* ==========================================================
   STARTUP
========================================================== */

window.addEventListener(

    "load",

    ()=>{

        setTimeout(

            refreshDashboard,

            250

        );

    }

);

console.log(

    "Dashboard v0.9.0 Loaded"

);
