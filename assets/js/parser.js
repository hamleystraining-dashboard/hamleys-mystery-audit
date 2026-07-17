/* ==========================================================
   Hamleys Mystery Audit Intelligence
   Parser
   Reads Excel (Base Store Master) and PDF (Audit Reports),
   normalises the data, and hands it to DataService.
   Contains no rendering or storage logic of its own.
   ========================================================== */

"use strict";

if(typeof pdfjsLib !== "undefined"){
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

/* ==========================================================
   SECTION NAME NORMALISATION
   Maps the raw section headings found in the PDF's
   "Sectional Change" table to the canonical labels used
   throughout the dashboards.
   ========================================================== */

const RETAIL_SECTION_MAP = {
    "H - HAMLEYS FIRST IMPRESSION": "H - Hamleys First Impression",
    "A - APPROACHING RIGHT": "A - Approaching Right",
    "M - MEETING THY NEEDS": "M - Meeting Thy Needs",
    "L - LOST IN DEMOS": "L - Lost In Demos",
    "E - ENGAGING TILL EXPERIENCE": "E - Engaging Till Experience",
    "Y - YOU COME FIRST": "Y - You Come First",
    "S - SEEING THEM OFF": "S - Seeing Them Off"
};

const PLAY_SECTION_MAP = {
    "ATTRACTION": "Attraction",
    "WELCOME": "Welcome",
    "ENTRY ASSISTANCE": "Entry Assistance",
    "SAFETY": "Safety",
    "OUT FOR PLAY": "Out For Play",
    "MAGIC PILLARS": "Magic Pillars",
    "EXIT": "Exit",
    "CSD BIRTHDAY ENQUIRY": "CSD Birthday Enquiry"
};

const NON_SCORED_SECTIONS = ["OVERALL EXPERIENCE", "ATTACHMENTS"];

/* ==========================================================
   EXCEL — BASE STORE MASTER
   ========================================================== */

function readExcelFile(file){
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = event => {
            try{
                const workbook = XLSX.read(event.target.result, { type: "binary" });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
                resolve(rows);
            }catch(err){
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error("Unable to read file: " + file.name));
        reader.readAsBinaryString(file);
    });
}

async function parseBaseStoreFile(file){
    const rows = await readExcelFile(file);
    return rows.map(row => ({
        storeName: String(row["Store Name"] || "").trim(),
        storeCode: String(row["Store Code"] || "").trim(),
        rom: String(row["ROM Name"] || "").trim(),
        sd: String(row["SD Name"] || "").trim(),
        rm: String(row["RM Name"] || "").trim()
    })).filter(r => r.storeCode);
}

/* ==========================================================
   PDF — MYSTERY AUDIT REPORT
   ========================================================== */

async function extractPdfText(file){
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const page = await pdf.getPage(1);
    const content = await page.getTextContent();

    // Group text items into lines using their vertical position.
    const lines = [];
    let currentY = null;
    let currentLine = [];
    content.items.forEach(item => {
        const y = Math.round(item.transform[5]);
        if(currentY === null || Math.abs(y - currentY) > 2){
            if(currentLine.length) lines.push(currentLine.join(" ").trim());
            currentLine = [item.str];
            currentY = y;
        }else{
            currentLine.push(item.str);
        }
    });
    if(currentLine.length) lines.push(currentLine.join(" ").trim());
    return lines.filter(Boolean);
}

function parseAuditLines(lines, sourceFileName){
    const joined = lines.join("\n");

    // Evaluation ID + Company/Survey (business + wave)
    const idIndex = lines.findIndex(l => /^ID\s*#/i.test(l));
    let evaluationId = null, business = "Retail", wave = "";
    if(idIndex >= 0){
        const headerLine = lines[idIndex]; // "ID # Hamleys: Retail - Mystery Visit"
        business = /play/i.test(headerLine) ? "Play" : "Retail";
        evaluationId = (lines[idIndex + 1] || "").match(/\d+/)?.[0] || null;
        wave = lines[idIndex + 2] || "";
    }

    // Location block: "Report Date <Store Name>" / "<date>" / "ID# <code>"
    const locIndex = lines.findIndex(l => /^Report Date/i.test(l));
    let storeName = "", storeCode = "", auditDate = null;
    if(locIndex >= 0){
        storeName = lines[locIndex].replace(/^Report Date\s*/i, "").trim();
        const dateLine = lines[locIndex + 1] || "";
        const dateMatch = dateLine.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
        if(dateMatch){
            let [, m, d, y] = dateMatch;
            if(y.length === 2) y = "20" + y;
            auditDate = new Date(Number(y), Number(m) - 1, Number(d));
        }
        const codeLine = lines[locIndex + 2] || "";
        const codeMatch = codeLine.match(/ID#\s*([A-Za-z0-9]+)/i);
        if(codeMatch) storeCode = codeMatch[1].toUpperCase();
    }

    // Sectional Change table rows, e.g.
    // "H - HAMLEYS FIRST IMPRESSION 29/29 100 % 24/30 80 % +5 +20 %"
    // or unscored: "SAFETY / -- --"
    const sectionMap = business === "Play" ? PLAY_SECTION_MAP : RETAIL_SECTION_MAP;
    const sections = {};
    let sumAct = 0, sumPos = 0;

    lines.forEach(line => {
        const scoredMatch = line.match(/^([A-Z][A-Z\s\-]+?)\s+(\d+)\/(\d+)\s+(\d+)\s*%/);
        if(scoredMatch){
            const rawName = scoredMatch[1].trim();
            if(NON_SCORED_SECTIONS.includes(rawName)) return;
            const label = sectionMap[rawName];
            if(!label) return;
            const act = Number(scoredMatch[2]);
            const pos = Number(scoredMatch[3]);
            sections[label] = pos ? Number(((act / pos) * 100).toFixed(1)) : 0;
            sumAct += act;
            sumPos += pos;
        }
    });

    const overall = sumPos ? Number(((sumAct / sumPos) * 100).toFixed(1)) : 0;

    if(!evaluationId || !storeCode || sumPos === 0){
        throw new Error(`Could not parse audit report structure: ${sourceFileName}`);
    }

    return {
        business,
        evaluationId,
        wave,
        storeCode,
        storeName,
        auditDate: auditDate || new Date(),
        overall,
        overallActPos: `${sumAct}/${sumPos}`,
        sections,
        sourceFile: sourceFileName
    };
}

async function parseAuditPdf(file){
    if(typeof pdfjsLib === "undefined"){
        throw new Error("PDF engine not loaded");
    }
    const lines = await extractPdfText(file);
    return parseAuditLines(lines, file.name);
}

async function parseAuditPdfBatch(fileList){
    const results = { added: [], duplicates: [], failed: [] };
    for(const file of Array.from(fileList)){
        try{
            const record = await parseAuditPdf(file);
            const wasAdded = DataServiceAPI.addAuditRecord(record);
            if(wasAdded){
                results.added.push(record);
            }else{
                results.duplicates.push(file.name);
            }
        }catch(err){
            console.error(err);
            results.failed.push({ name: file.name, error: err.message });
        }
    }
    return results;
}

/* ==========================================================
   PUBLIC API
   ========================================================== */

window.ParserAPI = {
    parseBaseStoreFile,
    parseAuditPdf,
    parseAuditPdfBatch
};

console.log("Parser Loaded");
