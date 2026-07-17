/* ==========================================================
   Hamleys Mystery Audit Intelligence
   HR Cases Engine
   Part 1
========================================================== */

"use strict";

const Cases={

    records:[],

    filtered:[]

};

/* ==========================================================
   ACTION PROCESS — SLA POLICY (edit these to match actual policy)
========================================================== */

const SLA_DAYS = {
    ld: 3,   // L&D must start the process within 3 days of a qualifying audit
    rom: 3,  // ROM must submit defaulter details within 3 days of L&D starting
    hr: 5    // HR must issue the action letter within 5 days of ROM submitting
};

function daysBetween(a, b){
    return Math.floor((new Date(b) - new Date(a)) / 86400000);
}

/* ==========================================================
   START ACTION PROCESS (triggered by L&D)
========================================================== */

function startActionProcess(data){
    const record = {
        id: Date.now(),
        type: "ActionProcess",
        storeName: data.storeName,
        storeCode: data.storeCode,
        rm: data.rm || "",
        rom: data.rom || "",
        sd: data.sd || "",
        auditScore: data.auditScore,
        threshold: data.threshold, // "below80" | "below60"
        status: "Open",
        stage: "Started",
        ldStartedBy: data.startedBy || "L&D",
        ldStartedOn: new Date(),
        romSubmittedBy: null,
        romSubmittedOn: null,
        defaulterName: "",
        defaulterCode: "",
        sdName: data.sd || "",
        sdCode: "",
        hrAction: null,
        hrClosedBy: null,
        hrClosedOn: null,
        createdOn: new Date()
    };
    Cases.records.push(record);
    saveCases();
    return record;
}

/* ==========================================================
   ROM SUBMITS DEFAULTER DETAILS
========================================================== */

function submitDefaulterDetails(id, data){
    const record = Cases.records.find(x => x.id == id);
    if(!record) return null;
    record.defaulterName = data.defaulterName || "";
    record.defaulterCode = data.defaulterCode || "";
    record.sdName = data.sdName || record.sdName;
    record.sdCode = data.sdCode || "";
    record.romSubmittedBy = data.submittedBy || "";
    record.romSubmittedOn = new Date();
    record.stage = "DefaultersSubmitted";
    record.updatedOn = new Date();
    saveCases();
    return record;
}

/* ==========================================================
   HR CLOSES THE PROCESS
========================================================== */

function closeActionProcess(id, data){
    const record = Cases.records.find(x => x.id == id);
    if(!record) return null;
    record.hrAction = data.hrAction;
    record.hrClosedBy = data.closedBy || "";
    record.hrClosedOn = new Date();
    record.stage = "Closed";
    record.status = "Closed";
    record.updatedOn = new Date();
    saveCases();
    return record;
}

function getActionProcesses(){
    return Cases.records.filter(x => x.type === "ActionProcess");
}

function getOpenActionProcesses(){
    return getActionProcesses().filter(x => x.status === "Open");
}

/* ==========================================================
   PROCESS TRACKER — tick/cross + delay per stakeholder
========================================================== */

function getProcessTracker(){
    const now = new Date();
    return getActionProcesses().map(record => {
        const ldDone = !!record.ldStartedOn;
        const romDone = !!record.romSubmittedOn;
        const hrDone = !!record.hrClosedOn;

        const romDelayed = ldDone && !romDone && daysBetween(record.ldStartedOn, now) > SLA_DAYS.rom;
        const hrDelayed = romDone && !hrDone && daysBetween(record.romSubmittedOn, now) > SLA_DAYS.hr;

        return { ...record, ldDone, romDone, hrDone, romDelayed, hrDelayed };
    }).sort((a, b) => new Date(b.ldStartedOn) - new Date(a.ldStartedOn));
}

/* ==========================================================
   EMAIL NOTIFICATION (mailto — no backend on GitHub Pages)
========================================================== */

function buildMailto(to, subject, body){
    const params = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return `mailto:${encodeURIComponent(to || "")}?${params}`;
}

/* ==========================================================
   ADD CASE
========================================================== */

function addCase(caseData){

    caseData.id=Date.now();

    caseData.status="Open";

    caseData.createdOn=new Date();

    Cases.records.push(caseData);

    saveCases();

    return caseData;

}

/* ==========================================================
   UPDATE STATUS
========================================================== */

function updateCaseStatus(id,status){

    const record=

        Cases.records.find(

            x=>x.id==id

        );

    if(!record) return;

    record.status=status;

    record.updatedOn=new Date();

    saveCases();

}

/* ==========================================================
   HR ACTION
========================================================== */

function updateHRAction(id,action){

    const record=

        Cases.records.find(

            x=>x.id==id

        );

    if(!record) return;

    record.hrAction=action;

    record.updatedOn=new Date();

    saveCases();

}

/* ==========================================================
   HRBP
========================================================== */

function assignHRBP(id,name){

    const record=

        Cases.records.find(

            x=>x.id==id

        );

    if(!record) return;

    record.hrbp=name;

    saveCases();

}/* ==========================================================
   FILTERS
========================================================== */

function getOpenCases(){

    return Cases.records.filter(

        x=>x.status==="Open"

    );

}

function getClosedCases(){

    return Cases.records.filter(

        x=>x.status==="Closed"

    );

}

function getCasesByStore(store){

    return Cases.records.filter(

        x=>x.storeName===store

    );

}

function getCasesByROM(rom){

    return Cases.records.filter(

        x=>x.rom===rom

    );

}

function getCasesByHRBP(hrbp){

    return Cases.records.filter(

        x=>x.hrbp===hrbp

    );

}

/* ==========================================================
   SCOPED FILTERS (used by RM / ROM / SD dashboards)
========================================================== */

function getCasesByField(field,value){

    if(!value || value==="All"){
        return Cases.records;
    }

    return Cases.records.filter(
        x=>x[field]===value
    );

}

function getOpenCasesByField(field,value){

    return getCasesByField(field,value).filter(
        x=>x.status==="Open"
    );

}

/* ==========================================================
   STORAGE
========================================================== */

function saveCases(){

    localStorage.setItem(

        "hamleysCases",

        JSON.stringify(

            Cases.records

        )

    );

}

function loadCases(){

    const data=

        localStorage.getItem(

            "hamleysCases"

        );

    if(!data){

        Cases.records=[];

        return;

    }

    Cases.records=

        JSON.parse(data);

}

/* ==========================================================
   DELETE
========================================================== */

function deleteCase(id){

    Cases.records=

        Cases.records.filter(

            x=>x.id!=id

        );

    saveCases();

}

/* ==========================================================
   SUMMARY
========================================================== */

function getCaseSummary(){

    return{

        total:

            Cases.records.length,

        open:

            getOpenCases().length,

        closed:

            getClosedCases().length,

        warningLetters:

            Cases.records.filter(

                x=>x.hrAction==="Warning Letter"

            ).length,

        terminationLetters:

            Cases.records.filter(

                x=>x.hrAction==="Termination"

            ).length

    };

}/* ==========================================================
   EXPORT CASES
========================================================== */

function exportCases(){

    const blob=new Blob(

        [

            JSON.stringify(

                Cases.records,

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

        "hamleys_hr_cases.json";

    link.click();

}

/* ==========================================================
   IMPORT CASES
========================================================== */

function importCases(json){

    try{

        Cases.records=

            JSON.parse(json);

        saveCases();

    }

    catch(e){

        console.error(e);

    }

}

/* ==========================================================
   DASHBOARD STATS
========================================================== */

function dashboardCases(){

    return{

        total:

            Cases.records.length,

        open:

            getOpenCases().length,

        closed:

            getClosedCases().length

    };

}

/* ==========================================================
   INITIALISE
========================================================== */

loadCases();

/* ==========================================================
   PUBLIC API
========================================================== */

window.CasesAPI={

    addCase,

    updateCaseStatus,

    updateHRAction,

    assignHRBP,

    deleteCase,

    getOpenCases,

    getClosedCases,

    getCasesByStore,

    getCasesByROM,

    getCasesByHRBP,

    getCasesByField,

    getOpenCasesByField,

    getCaseSummary,

    dashboardCases,

    exportCases,

    importCases,

    startActionProcess,

    submitDefaulterDetails,

    closeActionProcess,

    getActionProcesses,

    getOpenActionProcesses,

    getProcessTracker,

    buildMailto,

    SLA_DAYS

};

console.log("HR Cases Engine Loaded");
