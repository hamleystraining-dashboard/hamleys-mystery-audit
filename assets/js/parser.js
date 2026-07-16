/* ==========================================================
   Hamleys Mystery Audit Intelligence
   Parser Engine
   Version 1.0
========================================================== */

"use strict";

const Parser = {

    retailData: [],

    playData: [],

    baseStoreData: []

};

/* ==========================================================
   LOAD EXCEL
========================================================== */

async function loadExcel(file){

    return new Promise((resolve,reject)=>{

        const reader=new FileReader();

        reader.onload=function(e){

            try{

                const data=new Uint8Array(e.target.result);

                const workbook=XLSX.read(data,{

                    type:"array"

                });

                resolve(workbook);

            }

            catch(err){

                reject(err);

            }

        };

        reader.readAsArrayBuffer(file);

    });

}

/* ==========================================================
   SHEET TO JSON
========================================================== */

function sheetToJson(workbook,sheetName){

    const sheet=workbook.Sheets[sheetName];

    if(!sheet) return [];

    return XLSX.utils.sheet_to_json(sheet,{
        defval:""
    });

}

/* ==========================================================
   BASE STORE
========================================================== */

async function parseBaseStore(file){

    const workbook=

        await loadExcel(file);

    const first=

        workbook.SheetNames[0];

    Parser.baseStoreData=

        sheetToJson(workbook,first);

    DataServiceAPI.loadBaseStoreData(

        Parser.baseStoreData

    );

    return Parser.baseStoreData;

}

/* ==========================================================
   RETAIL AUDIT
========================================================== */

async function parseRetailAudit(file){

    const workbook=

        await loadExcel(file);

    const first=

        workbook.SheetNames[0];

    Parser.retailData=

        sheetToJson(workbook,first);

    DataServiceAPI.loadRetailAudits(

        Parser.retailData

    );

    return Parser.retailData;

}

/* ==========================================================
   PLAY AUDIT
========================================================== */

async function parsePlayAudit(file){

    const workbook=

        await loadExcel(file);

    const sheet=

        workbook.SheetNames.find(

            x=>x==="Recent Evaluations"

        );

    Parser.playData=

        sheetToJson(workbook,sheet);

    DataServiceAPI.loadPlayAudits(

        Parser.playData

    );

    return Parser.playData;

}

/* ==========================================================
   PUBLIC API
========================================================== */

window.ParserAPI={

    parseBaseStore,

    parseRetailAudit,

    parsePlayAudit

};

console.log("Parser Loaded");
