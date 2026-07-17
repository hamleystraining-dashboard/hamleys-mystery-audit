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

    importCases

};

console.log("HR Cases Engine Loaded");
