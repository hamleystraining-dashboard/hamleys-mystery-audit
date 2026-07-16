/* ==========================================================
   Hamleys Mystery Audit Intelligence
   Admin Portal Controller
   Part 1
========================================================== */

"use strict";

const Admin={

    business:"Retail",

    uploadHistory:[],

    uploadedPDFs:[]

};

/* ==========================================================
   INITIALISE
========================================================== */

document.addEventListener(

    "DOMContentLoaded",

    initialiseAdmin

);

function initialiseAdmin(){

    bindButtons();

    loadHistory();

    updateKPIs();

}

/* ==========================================================
   BUTTONS
========================================================== */

function bindButtons(){

    document
    .getElementById("uploadBaseStore")
    ?.addEventListener(

        "click",

        uploadBaseStore

    );

    document
    .getElementById("uploadAudit")
    ?.addEventListener(

        "click",

        uploadAudit

    );

    document
    .getElementById("uploadPDF")
    ?.addEventListener(

        "click",

        uploadPDF

    );

    document
    .getElementById("refreshPreview")
    ?.addEventListener(

        "click",

        refreshPreview

    );

    document
    .getElementById("clearLogs")
    ?.addEventListener(

        "click",

        clearLogs

    );

}

/* ==========================================================
   BUSINESS TOGGLE
========================================================== */

document.addEventListener(

    "click",

    function(e){

        if(e.target.id==="retailToggle"){

            Admin.business="Retail";

        }

        if(e.target.id==="playToggle"){

            Admin.business="Play";

        }

    }

);/* ==========================================================
   BASE STORE UPLOAD
========================================================== */

async function uploadBaseStore(){

    const file=document
    .getElementById("baseStoreUpload")
    .files[0];

    if(!file){

        alert("Please select Base Store Master.");

        return;

    }

    await ParserAPI.parseBaseStore(file);

    addHistory(

        "Base Store Master",

        file.name,

        "Success"

    );

    document.getElementById("baseStatus").innerHTML="Completed";

    document.getElementById("baseStatus").className="status success";

    updateKPIs();

}

/* ==========================================================
   AUDIT UPLOAD
========================================================== */

async function uploadAudit(){

    const file=document
    .getElementById("auditUpload")
    .files[0];

    if(!file){

        alert("Please select Audit File.");

        return;

    }

    if(Admin.business==="Retail"){

        await ParserAPI.parseRetailAudit(file);

    }

    else{

        await ParserAPI.parsePlayAudit(file);

    }

    addHistory(

        Admin.business+" Audit",

        file.name,

        "Success"

    );

    document.getElementById("auditStatus").innerHTML="Completed";

    document.getElementById("auditStatus").className="status success";

    updateKPIs();

}

/* ==========================================================
   PDF UPLOAD
========================================================== */

function uploadPDF(){

    const files=[

        ...document
        .getElementById("pdfUpload")
        .files

    ];

    files.forEach(file=>{

        Admin.uploadedPDFs.push({

            business:Admin.business,

            name:file.name,

            uploaded:new Date()

        });

        addHistory(

            Admin.business+" PDF",

            file.name,

            "Uploaded"

        );

    });

    document.getElementById("pdfStatus").innerHTML="Completed";

    document.getElementById("pdfStatus").className="status success";

    updateKPIs();

}/* ==========================================================
   PREVIEW
========================================================== */

function refreshPreview(){

    const tbody=

        document.getElementById(

            "previewTable"

        );

    if(!tbody) return;

    tbody.innerHTML="";

    const stores=

        DataService.storeMaster || [];

    stores.slice(0,50).forEach(store=>{

        const row=

            document.createElement("tr");

        row.innerHTML=`

            <td>${store.storeCode}</td>

            <td>${store.storeName}</td>

            <td>${store.rm}</td>

            <td>${store.rom}</td>

            <td>${store.sd}</td>

            <td>--</td>

        `;

        tbody.appendChild(row);

    });

}

/* ==========================================================
   HISTORY
========================================================== */

function addHistory(

    type,

    file,

    status

){

    Admin.uploadHistory.unshift({

        date:new Date(),

        business:Admin.business,

        type:type,

        file:file,

        status:status

    });

    saveHistory();

    renderHistory();

}

function renderHistory(){

    const tbody=

        document.getElementById(

            "uploadHistory"

        );

    if(!tbody) return;

    tbody.innerHTML="";

    Admin.uploadHistory.forEach(item=>{

        const row=

            document.createElement("tr");

        row.innerHTML=`

            <td>${formatDateTime(item.date)}</td>

            <td>${item.business}</td>

            <td>${item.file}</td>

            <td>${item.status}</td>

        `;

        tbody.appendChild(row);

    });

}

/* ==========================================================
   DATE FORMAT
========================================================== */

function formatDateTime(date){

    return new Date(date)

    .toLocaleString(

        "en-IN"

    );

}/* ==========================================================
   KPI UPDATE
========================================================== */

function updateKPIs(){

    document.getElementById("storeCount").innerHTML=

        DataService.storeMaster

        ? DataService.storeMaster.length

        :0;

    document.getElementById("retailCount").innerHTML=

        DataService.retailAudits

        ? DataService.retailAudits.length

        :0;

    document.getElementById("playCount").innerHTML=

        DataService.playAudits

        ? DataService.playAudits.length

        :0;

    document.getElementById("pdfCount").innerHTML=

        Admin.uploadedPDFs.length;

    document.getElementById("lastUpload").innerHTML=

        Admin.uploadHistory.length

        ? formatDateTime(

            Admin.uploadHistory[0].date

          )

        :"—";

}

/* ==========================================================
   LOCAL STORAGE
========================================================== */

function saveHistory(){

    localStorage.setItem(

        "hamleysUploadHistory",

        JSON.stringify(

            Admin.uploadHistory

        )

    );

}

function loadHistory(){

    const data=

        localStorage.getItem(

            "hamleysUploadHistory"

        );

    if(data){

        Admin.uploadHistory=

            JSON.parse(data);

    }

    renderHistory();

}

/* ==========================================================
   CLEAR LOGS
========================================================== */

function clearLogs(){

    if(

        !confirm(

            "Clear upload history?"

        )

    ) return;

    Admin.uploadHistory=[];

    saveHistory();

    renderHistory();

    updateKPIs();

}/* ==========================================================
   DATABASE EXPORT
========================================================== */

document
.getElementById("exportDatabase")
?.addEventListener(

    "click",

    exportDatabase

);

function exportDatabase(){

    const database={

        generatedOn:new Date(),

        business:Admin.business,

        baseStores:DataService.storeMaster,

        retailAudits:DataService.retailAudits,

        playAudits:DataService.playAudits,

        uploadHistory:Admin.uploadHistory,

        uploadedPDFs:Admin.uploadedPDFs

    };

    const blob=new Blob(

        [

            JSON.stringify(

                database,

                null,

                2

            )

        ],

        {

            type:"application/json"

        }

    );

    const link=document.createElement("a");

    link.href=

        URL.createObjectURL(blob);

    link.download=

        "hamleys_database.json";

    link.click();

}

/* ==========================================================
   DASHBOARD REFRESH
========================================================== */

document
.getElementById("refreshDashboardData")
?.addEventListener(

    "click",

    ()=>{

        DashboardAPI.refresh();

        alert(

            "Dashboard refreshed successfully."

        );

    }

);

document
.getElementById("rebuildIndexes")
?.addEventListener(

    "click",

    ()=>{

        refreshPreview();

        updateKPIs();

        alert(

            "Store mappings rebuilt."

        );

    }

);

/* ==========================================================
   INITIAL REFRESH
========================================================== */

window.addEventListener(

    "load",

    ()=>{

        updateKPIs();

        refreshPreview();

    }

);

/* ==========================================================
   PUBLIC API
========================================================== */

window.AdminAPI={

    uploadBaseStore,

    uploadAudit,

    uploadPDF,

    refreshPreview,

    updateKPIs,

    exportDatabase,

    clearLogs

};

console.log(

    "Admin Controller Loaded"

);
