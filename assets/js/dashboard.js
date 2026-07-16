/* ==========================================================
   Hamleys Mystery Audit Intelligence
   Dashboard Controller
   Part 1
========================================================== */

"use strict";

/* ==========================================================
   DASHBOARD
========================================================== */

const Dashboard = {

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

document.addEventListener("DOMContentLoaded",()=>{

    initialiseDashboard();

});

function initialiseDashboard(){

    initialiseFilters();

    loadDropdowns();

    refreshDashboard();

}

/* ==========================================================
   FILTERS
========================================================== */

function initialiseFilters(){

    const from=document.getElementById("fromDate");

    const to=document.getElementById("toDate");

    const rm=document.getElementById("rmFilter");

    const rom=document.getElementById("romFilter");

    const sd=document.getElementById("sdFilter");

    const store=document.getElementById("storeFilter");

    const section=document.getElementById("sectionFilter");

    if(from){

        from.addEventListener("change",refreshDashboard);

    }

    if(to){

        to.addEventListener("change",refreshDashboard);

    }

    if(rm){

        rm.addEventListener("change",refreshDashboard);

    }

    if(rom){

        rom.addEventListener("change",refreshDashboard);

    }

    if(sd){

        sd.addEventListener("change",refreshDashboard);

    }

    if(store){

        store.addEventListener("change",refreshDashboard);

    }

    if(section){

        section.addEventListener("change",refreshDashboard);

    }

}

/* ==========================================================
   LOAD DROPDOWNS
========================================================== */

function loadDropdowns(){

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

}

function loadSelect(id,data){

    const select=document.getElementById(id);

    if(!select) return;

    select.innerHTML="";

    data.forEach(item=>{

        const option=document.createElement("option");

        option.value=item;

        option.text=item;

        select.appendChild(option);

    });

}/* ==========================================================
   REFRESH DASHBOARD
========================================================== */

function refreshDashboard(){

    collectFilters();

    if(
        typeof DataServiceAPI==="undefined"
    ){
        console.warn("DataServiceAPI not ready");
        return;
    }

    const summary=

        DataServiceAPI.getDashboardSummary(

            Dashboard.filters

        );

    if(!summary){

        console.warn("No dashboard summary available");

        return;

    }

    renderKPIs(summary);

    renderInsights(summary);

    renderTables(summary);

    renderCharts(summary);

    hideWorkspaceSections();

    switch(App.currentPage){

        case "RM Wise":

            showSection("hierarchyWorkspace");

            break;

        case "ROM Wise":

            showSection("hierarchyWorkspace");

            break;

        case "SD Wise":

            showSection("hierarchyWorkspace");

            break;

        case "Store Wise":

            showSection("storeProfile");

            break;

        default:

            showSection("overviewSection");

    }

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

    setText(

        "overallIndiaScore",

        summary.averageScore+"%"

    );

    setText(

        "avgScore",

        summary.averageScore

    );

    setText(

        "storesAudited",

        summary.storesAudited

    );

    setText(

        "below80",

        summary.below80

    );

    setText(

        "below60",

        summary.below60

    );

    setText(

        "openCases",

        summary.below80

    );

}

/* ==========================================================
   AI INSIGHTS
========================================================== */

function renderInsights(summary){

    const container =

        document.getElementById(

            "insightContainer"

        );

    if(!container) return;

    container.innerHTML="";

    const insights =

        DataServiceAPI.generateInsights(

            DataServiceAPI.getFilteredDataset(

                Dashboard.filters

            )

        );

    insights.forEach(text=>{

        const card =

            document.createElement("div");

        card.className="insight-card";

        card.innerHTML=`

            <h4>Insight</h4>

            <p>${text}</p>

        `;

        container.appendChild(card);

    });

}/* ==========================================================
   TOP & BOTTOM TABLES
========================================================== */

function renderTables(summary){

    renderTable(

        "topStoresTable",

        summary.topStores

    );

    renderTable(

        "bottomStoresTable",

        summary.bottomStores

    );

}

function renderTable(id,data){

    const table=document.getElementById(id);

    if(!table) return;

    table.innerHTML="";

    data.forEach(item=>{

        const row=document.createElement("tr");

        row.innerHTML=`

            <td>${item.storeName}</td>

            <td>${item.rm || "-"}</td>

            <td>${item.rom || "-"}</td>

            <td>${item.sd || "-"}</td>

            <td>${item.overall}%</td>

        `;

        table.appendChild(row);

    });

}

/* ==========================================================
   CHARTS
========================================================== */

function renderCharts(summary){

    if(typeof renderIndiaTrendChart==="function"){

        renderIndiaTrendChart(

            Dashboard.filters

        );

    }

    if(typeof renderRegionalChart==="function"){

        renderRegionalChart(

            summary.regionalSummary

        );

    }

    if(typeof renderDistributionChart==="function"){

        renderDistributionChart(

            DataServiceAPI.getFilteredDataset(

                Dashboard.filters

            )

        );

    }

    if(typeof renderSectionChart==="function"){

        renderSectionChart(

            DataServiceAPI.getFilteredDataset(

                Dashboard.filters

            )

        );

    }

    if(typeof renderStoreTrendChart==="function"){

        renderStoreTrendChart(

            Dashboard.filters.store

        );

    }

}

/* ==========================================================
   STORE PROFILE
========================================================== */

function loadStoreProfile(storeCode){

    const profile=

        DataServiceAPI.getStoreProfile(

            storeCode

        );

    if(!profile) return;

    setText(

        "profileStoreName",

        profile.storeName

    );

    setText(

        "profileRM",

        profile.rm

    );

    setText(

        "profileROM",

        profile.rom

    );

    setText(

        "profileSD",

        profile.sd

    );

    if(profile.latest){

        setText(

            "profileScore",

            profile.latest.overall+"%"

        );

    }

}/* ==========================================================
   UTILITIES
========================================================== */

function value(id){

    const el=document.getElementById(id);

    return el ? el.value : "";

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
   RESET FILTERS
========================================================== */

function resetFilters(){

    const filters=[

        "rmFilter",

        "romFilter",

        "sdFilter",

        "storeFilter",

        "sectionFilter"

    ];

    filters.forEach(id=>{

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

document.addEventListener("click",function(e){

    if(e.target.id==="retailToggle"){

        refreshDashboard();

    }

    if(e.target.id==="playToggle"){

        refreshDashboard();

    }

});

/* ==========================================================
   WINDOW RESIZE
========================================================== */

window.addEventListener("resize",function(){

    if(typeof resizeCharts==="function"){

        resizeCharts();

    }

});

/* ==========================================================
   AUTO REFRESH
========================================================== */

function reloadDashboard(){

    refreshDashboard();

}

/* ==========================================================
   PUBLIC API
========================================================== */

window.DashboardAPI={

    refresh:refreshDashboard,

    reload:reloadDashboard,

    resetFilters:resetFilters,

    loadStoreProfile:loadStoreProfile

};

/* ==========================================================
   STARTUP
========================================================== */

window.addEventListener("load",()=>{

    setTimeout(()=>{

        refreshDashboard();

    },300);

});

console.log("Dashboard Controller Loaded");
