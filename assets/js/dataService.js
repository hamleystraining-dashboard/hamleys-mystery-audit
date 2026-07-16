/* ==========================================================
   Hamleys Mystery Audit Intelligence
   Data Service
   Part 1
========================================================== */

"use strict";

/* ==========================================================
   GLOBAL DATASTORE
========================================================== */

const DataService = {

    retailAudits: [],

    playAudits: [],

    storeMaster: [],

    filteredData: []

};

/* ==========================================================
   BASE STORE DATA
   Columns:
   Store Name
   Store Code
   ROM Name
   SD Name
   RM Name
========================================================== */

function loadBaseStoreData(rows){

    DataService.storeMaster = rows.map(row => ({

        storeName : String(row["Store Name"] || "").trim(),

        storeCode : String(row["Store Code"] || "").trim(),

        rom : String(row["ROM Name"] || "").trim(),

        sd : String(row["SD Name"] || "").trim(),

        rm : String(row["RM Name"] || "").trim()

    }));

}

/* ==========================================================
   RETAIL AUDITS

   Excel Columns

   Location ID
   Location Name
   Audit Date
   Evaluation Score

========================================================== */

function loadRetailAudits(rows){

    DataService.retailAudits = rows.map(row => ({

        business : "Retail",

        evaluationId : row["Evaluation ID"],

        wave : row["Wave Name"],

        storeCode : String(row["Location ID"] || "").trim(),

        storeName : String(row["Location Name"] || "").trim(),

        auditDate : new Date(row["Audit Date"]),

        overall :

            Number(row["Evaluation Score"] || 0),

        sections : {

            firstImpression :

                Number(row["H - HAMLEYS FIRST IMPRESSION"] || 0),

            approachingRight :

                Number(row["A - APPROACHING RIGHT"] || 0),

            meetingNeeds :

                Number(row["M - MEETING THY NEEDS"] || 0),

            lostInDemos :

                Number(row["L - LOST IN DEMOS"] || 0),

            tillExperience :

                Number(row["E - ENGAGING TILL EXPERIENCE"] || 0),

            youComeFirst :

                Number(row["Y - YOU COME FIRST"] || 0),

            seeingThemOff :

                Number(row["S - SEEING THEM OFF"] || 0)

        }

    }));

}

/* ==========================================================
   PLAY AUDITS

   Recent Evaluations Sheet

========================================================== */

function loadPlayAudits(rows){

    DataService.playAudits = rows.map(row => {

        const location =

            String(row["Location"] || "");

        const code =

            location.substring(0,4);

        const name =

            location.substring(7);

        return{

            business:"Play",

            evaluationId:

                row["Evaluation ID"],

            auditDate:

                new Date(row["Date"]),

            storeCode:

                code,

            storeName:

                name,

            overall:

                Number(

                    String(row["Overall Score"])

                    .replace("%","")

                )

        };

    });

}

/* ==========================================================
   STORE LOOKUP
========================================================== */

function getStore(storeCode){

    return DataService.storeMaster.find(

        x=>x.storeCode===storeCode

    );

}

function enrichAudit(audit){

    const store =

        getStore(audit.storeCode);

    if(!store) return audit;

    return{

        ...audit,

        rm:store.rm,

        rom:store.rom,

        sd:store.sd

    };

}/* ==========================================================
   COMBINED DATASET
========================================================== */

function getCurrentDataset(){

    const dataset =

        App.business === "retail"

        ? DataService.retailAudits

        : DataService.playAudits;

    return dataset.map(enrichAudit);

}

/* ==========================================================
   DATE FILTER
========================================================== */

function filterByDate(data, fromDate, toDate){

    if(!fromDate || !toDate)

        return data;

    return data.filter(item=>{

        const d = new Date(item.auditDate);

        return d >= fromDate && d <= toDate;

    });

}

/* ==========================================================
   RM FILTER
========================================================== */

function filterByRM(data, rm){

    if(!rm || rm==="All")

        return data;

    return data.filter(

        x=>x.rm===rm

    );

}

/* ==========================================================
   ROM FILTER
========================================================== */

function filterByROM(data, rom){

    if(!rom || rom==="All")

        return data;

    return data.filter(

        x=>x.rom===rom

    );

}

/* ==========================================================
   SD FILTER
========================================================== */

function filterBySD(data, sd){

    if(!sd || sd==="All")

        return data;

    return data.filter(

        x=>x.sd===sd

    );

}

/* ==========================================================
   STORE FILTER
========================================================== */

function filterByStore(data, store){

    if(!store || store==="All")

        return data;

    return data.filter(

        x=>x.storeName===store

    );

}

/* ==========================================================
   SECTION FILTER
========================================================== */

function getSectionScore(audit, section){

    if(section==="All Sections")

        return audit.overall;

    if(!audit.sections)

        return audit.overall;

    switch(section){

        case "First Impression":

            return audit.sections.firstImpression;

        case "Approaching Right":

            return audit.sections.approachingRight;

        case "Meeting Thy Needs":

            return audit.sections.meetingNeeds;

        case "Lost In Demos":

            return audit.sections.lostInDemos;

        case "Till Experience":

            return audit.sections.tillExperience;

        case "You Come First":

            return audit.sections.youComeFirst;

        case "Seeing Them Off":

            return audit.sections.seeingThemOff;

        default:

            return audit.overall;

    }

}

/* ==========================================================
   KPI CALCULATIONS
========================================================== */

function calculateAverage(data){

    if(data.length===0)

        return 0;

    const total =

        data.reduce(

            (sum,item)=>sum+item.overall,

            0

        );

    return Number(

        (total/data.length)

        .toFixed(1)

    );

}

function storesAudited(data){

    return new Set(

        data.map(

            x=>x.storeCode

        )

    ).size;

}

function below80(data){

    return data.filter(

        x=>x.overall<80

    ).length;

}

function below60(data){

    return data.filter(

        x=>x.overall<60

    ).length;

}

/* ==========================================================
   FILTER PIPELINE
========================================================== */

function getFilteredDataset(filters={}){

    let data =

        getCurrentDataset();

    if(filters.from && filters.to){

        data = filterByDate(

            data,

            filters.from,

            filters.to

        );

    }

    data = filterByRM(

        data,

        filters.rm

    );

    data = filterByROM(

        data,

        filters.rom

    );

    data = filterBySD(

        data,

        filters.sd

    );

    data = filterByStore(

        data,

        filters.store

    );

    DataService.filteredData = data;

    return data;

}/* ==========================================================
   TOP & BOTTOM PERFORMERS
========================================================== */

function getTopStores(limit = 10){

    const latest = getLatestAuditPerStore(
        DataService.filteredData
    );

    return latest
        .sort((a,b)=>b.overall-a.overall)
        .slice(0,limit);

}

function getBottomStores(limit = 10){

    const latest = getLatestAuditPerStore(
        DataService.filteredData
    );

    return latest
        .sort((a,b)=>a.overall-b.overall)
        .slice(0,limit);

}

/* ==========================================================
   LATEST AUDIT PER STORE
========================================================== */

function getLatestAuditPerStore(data){

    const map = {};

    data.forEach(item=>{

        const key = item.storeCode;

        if(!map[key]){

            map[key]=item;

            return;

        }

        if(

            new Date(item.auditDate) >

            new Date(map[key].auditDate)

        ){

            map[key]=item;

        }

    });

    return Object.values(map);

}

/* ==========================================================
   STORE HISTORY
========================================================== */

function getStoreHistory(storeCode){

    return getCurrentDataset()

        .filter(

            x=>x.storeCode===storeCode

        )

        .sort(

            (a,b)=>

            new Date(a.auditDate)-

            new Date(b.auditDate)

        );

}

/* ==========================================================
   REGION SUMMARY
========================================================== */

function getRegionSummary(){

    const summary={};

    getCurrentDataset()

    .forEach(audit=>{

        const key=audit.rm || "Unknown";

        if(!summary[key]){

            summary[key]={

                rm:key,

                total:0,

                count:0

            };

        }

        summary[key].total+=audit.overall;

        summary[key].count++;

    });

    return Object.values(summary)

    .map(r=>({

        rm:r.rm,

        average:Number(

            (r.total/r.count)

            .toFixed(1)

        )

    }))

    .sort(

        (a,b)=>b.average-a.average

    );

}

/* ==========================================================
   RM DROPDOWN
========================================================== */

function getRMList(){

    return [

        "All",

        ...new Set(

            DataService.storeMaster

            .map(x=>x.rm)

            .filter(Boolean)

        )

    ].sort();

}

/* ==========================================================
   ROM DROPDOWN
========================================================== */

function getROMList(){

    return [

        "All",

        ...new Set(

            DataService.storeMaster

            .map(x=>x.rom)

            .filter(Boolean)

        )

    ].sort();

}

/* ==========================================================
   SD DROPDOWN
========================================================== */

function getSDList(){

    return [

        "All",

        ...new Set(

            DataService.storeMaster

            .map(x=>x.sd)

            .filter(Boolean)

        )

    ].sort();

}

/* ==========================================================
   STORE DROPDOWN
========================================================== */

function getStoreList(){

    return [

        "All",

        ...new Set(

            DataService.storeMaster

            .map(x=>x.storeName)

            .filter(Boolean)

        )

    ].sort();

}/* ==========================================================
   DASHBOARD SUMMARY
========================================================== */

function getDashboardSummary(filters = {}){

    const data = getFilteredDataset(filters);

    return{

        averageScore : calculateAverage(data),

        storesAudited : storesAudited(data),

        below80 : below80(data),

        below60 : below60(data),

        totalAudits : data.length,

        topStores : getTopStores(10),

        bottomStores : getBottomStores(10),

        regionalSummary : getRegionSummary()

    };

}

/* ==========================================================
   STORE PROFILE
========================================================== */

function getStoreProfile(storeCode){

    const store = getStore(storeCode);

    const history = getStoreHistory(storeCode);

    return{

        ...store,

        history,

        latest :

            history.length

            ? history[history.length-1]

            : null

    };

}

/* ==========================================================
   AI INSIGHTS
========================================================== */

function generateInsights(data){

    const insights=[];

    if(!data.length)

        return insights;

    const avg = calculateAverage(data);

    if(avg>=90){

        insights.push(

            "Overall Mystery Audit performance is excellent."

        );

    }

    else if(avg>=80){

        insights.push(

            "Overall performance is stable but there is room for improvement."

        );

    }

    else{

        insights.push(

            "Average audit score is below target and requires immediate operational focus."

        );

    }

    if(below80(data)>0){

        insights.push(

            `${below80(data)} audit(s) are below the 80% intervention threshold.`

        );

    }

    if(below60(data)>0){

        insights.push(

            `${below60(data)} audit(s) are below the 60% critical threshold.`

        );

    }

    return insights;

}

/* ==========================================================
   LOOKUP HELPERS
========================================================== */

function findStoreByName(name){

    return DataService.storeMaster.find(

        s=>s.storeName===name

    );

}

function findStoreByCode(code){

    return DataService.storeMaster.find(

        s=>s.storeCode===code

    );

}

/* ==========================================================
   PUBLIC DATA SERVICE
========================================================== */

window.DataServiceAPI={

    getCurrentDataset,

    getFilteredDataset,

    getDashboardSummary,

    getStoreProfile,

    getStoreHistory,

    getTopStores,

    getBottomStores,

    getRMList,

    getROMList,

    getSDList,

    getStoreList,

    generateInsights,

    loadRetailAudits,

    loadPlayAudits,

    loadBaseStoreData,

    findStoreByCode,

    findStoreByName

};

/* ==========================================================
   INITIALISE
========================================================== */

console.log(

    "Hamleys Data Service Loaded"

);
