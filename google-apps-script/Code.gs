/* ==========================================================================
   Hamleys Mystery Audit Intelligence — Cases backend (Google Apps Script)
   ==========================================================================
   Runs as a Web App bound to a Google Sheet. Replaces localStorage as the
   shared, multi-user store for Cases/ROM/HRBP, and sends real email via
   MailApp using whichever Google account this script is deployed under
   (deploy this from hamleystraining@gmail.com so emails come from that
   address — see SETUP.md).

   Paste this whole file into Extensions > Apps Script > Code.gs of a new
   Google Sheet. Follow SETUP.md for the sheet structure and deployment.
   ========================================================================== */

// ---- Configuration — edit these two lines after setup -------------------
const SHEET_ID = "PASTE_YOUR_GOOGLE_SHEET_ID_HERE";
const DASHBOARD_BASE_URL = "https://hamleystraining-dashboard.github.io/hamleys-mystery-audit/";

const CASES_SHEET = "Cases";
const CONTACTS_SHEET = "Contacts";
const FROM_ALIAS = "hamleystraining@gmail.com";

const TRIGGER_REASONS = {
  "80_first": "Below 80 — First Time",
  "80_consecutive": "Below 80 — Consecutive",
  "60_first": "Below 60 — First Time",
  "60_consecutive": "Below 60 — Consecutive",
};

const CASES_HEADER = ["key","vertical","evalId","storeCode","storeName","unmapped","rom","sd","rm","date","score","stage","triggerReason","employeesJSON","historyJSON","updatedAt"];

// ---- Web app entry points --------------------------------------------------
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "list";
  if (action === "list") return jsonResponse(getAllCases());
  return jsonResponse({ error: "Unknown GET action: " + action });
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ error: "Invalid JSON body" });
  }
  const action = body.action;
  const p = body.payload || {};
  try {
    switch (action) {
      case "sync":           return jsonResponse(syncCases(p.candidates || []));
      case "triggerLD":      return jsonResponse(triggerLD(p.key, p.reason));
      case "addEmployee":    return jsonResponse(addEmployee(p.key, p.employee));
      case "removeEmployee": return jsonResponse(removeEmployee(p.key, p.employeeId));
      case "sendToHR":       return jsonResponse(sendToHR(p.key));
      case "closeEmployee":  return jsonResponse(closeEmployee(p.key, p.employeeId, p.closureNote));
      default:                return jsonResponse({ error: "Unknown action: " + action });
    }
  } catch (err) {
    return jsonResponse({ error: String(err) });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---- Sheet helpers ----------------------------------------------------------
function getSheet(name) {
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(name);
  if (!sh) throw new Error("Sheet tab not found: " + name + " — check SETUP.md for the expected tab names");
  return sh;
}

function rowToCase(header, row) {
  const obj = {};
  header.forEach((h, i) => obj[h] = row[i]);
  obj.unmapped = obj.unmapped === true || obj.unmapped === "TRUE";
  obj.score = Number(obj.score);
  obj.employees = safeParse(obj.employeesJSON, []);
  obj.history = safeParse(obj.historyJSON, []);
  delete obj.employeesJSON;
  delete obj.historyJSON;
  return obj;
}

function safeParse(str, fallback) {
  try { return JSON.parse(str || "null") || fallback; } catch (e) { return fallback; }
}

function getAllCases() {
  const sh = getSheet(CASES_SHEET);
  const values = sh.getDataRange().getValues();
  const header = values[0];
  return values.slice(1).filter(r => r[0]).map(r => rowToCase(header, r));
}

function getCaseByKey(key) {
  const sh = getSheet(CASES_SHEET);
  const values = sh.getDataRange().getValues();
  const header = values[0];
  const row = values.find((r, i) => i > 0 && r[0] === key);
  return row ? rowToCase(header, row) : null;
}

function findRowNum(sh, key) {
  const values = sh.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === key) return i + 1; // 1-indexed sheet row
  }
  return -1;
}

function updateCaseFields(key, patch) {
  const sh = getSheet(CASES_SHEET);
  const header = sh.getDataRange().getValues()[0];
  const colIdx = {};
  header.forEach((h, i) => colIdx[h] = i);
  const rowNum = findRowNum(sh, key);
  if (rowNum === -1) throw new Error("Case not found: " + key);
  Object.keys(patch).forEach(k => {
    if (colIdx[k] !== undefined) sh.getRange(rowNum, colIdx[k] + 1).setValue(patch[k]);
  });
  if (colIdx.updatedAt !== undefined) sh.getRange(rowNum, colIdx.updatedAt + 1).setValue(new Date().toISOString());
  return getCaseByKey(key);
}

function appendHistory(key, entry) {
  const c = getCaseByKey(key);
  const history = c.history || [];
  history.push(Object.assign({ at: new Date().toISOString() }, entry));
  updateCaseFields(key, { historyJSON: JSON.stringify(history) });
}

// ---- Sync: mirrors the client-side logic that used to run in localStorage.
// The client (cases.html) still computes which audits score <80 from the
// static JSON in the GitHub repo, and posts those candidates here. New ones
// get created as "flagged"; existing ones get their store/RM/ROM/SD mapping
// refreshed (self-heals stores that were "Unmapped" when Base Store Data
// gets corrected later) while stage/employees/history are left untouched.
function syncCases(candidates) {
  const sh = getSheet(CASES_SHEET);
  const values = sh.getDataRange().getValues();
  const header = values[0];
  const colIdx = {};
  header.forEach((h, i) => colIdx[h] = i);
  const existingRowNum = {};
  for (let i = 1; i < values.length; i++) {
    if (values[i][0]) existingRowNum[values[i][0]] = i + 1;
  }

  candidates.forEach(c => {
    if (existingRowNum[c.key]) {
      const rowNum = existingRowNum[c.key];
      sh.getRange(rowNum, colIdx.storeName + 1).setValue(c.storeName);
      sh.getRange(rowNum, colIdx.unmapped + 1).setValue(c.unmapped);
      sh.getRange(rowNum, colIdx.rom + 1).setValue(c.rom);
      sh.getRange(rowNum, colIdx.sd + 1).setValue(c.sd);
      sh.getRange(rowNum, colIdx.rm + 1).setValue(c.rm);
    } else {
      const newRow = CASES_HEADER.map(h => {
        switch (h) {
          case "key": return c.key;
          case "vertical": return c.vertical;
          case "evalId": return c.evalId;
          case "storeCode": return c.storeCode;
          case "storeName": return c.storeName;
          case "unmapped": return !!c.unmapped;
          case "rom": return c.rom;
          case "sd": return c.sd;
          case "rm": return c.rm;
          case "date": return c.date;
          case "score": return c.score;
          case "stage": return "flagged";
          case "triggerReason": return "";
          case "employeesJSON": return "[]";
          case "historyJSON": return JSON.stringify([{ stage: "flagged", at: new Date().toISOString(), by: "System", note: "Auto-flagged: score below 80" }]);
          case "updatedAt": return new Date().toISOString();
          default: return "";
        }
      });
      sh.appendRow(newRow);
    }
  });
  return getAllCases();
}

// ---- Contacts lookup ---------------------------------------------------
// Contacts sheet columns: name | role | email
// role is "ROM" or "HRBP" — add one row per ROM (name must exactly match
// the ROM name in Base Store Data) plus one row named "HRBP" with role
// "HRBP" for wherever HRBP case emails should land.
function lookupEmail(name, role) {
  const sh = getSheet(CONTACTS_SHEET);
  const values = sh.getDataRange().getValues();
  const header = values[0];
  const nameIdx = header.indexOf("name"), roleIdx = header.indexOf("role"), emailIdx = header.indexOf("email");
  for (let i = 1; i < values.length; i++) {
    if (values[i][nameIdx] === name && (!role || values[i][roleIdx] === role)) return values[i][emailIdx];
  }
  return null;
}

// ---- Case actions -------------------------------------------------------
function triggerLD(key, reason) {
  const c = getCaseByKey(key);
  if (!c) throw new Error("Case not found: " + key);
  updateCaseFields(key, { stage: "ld_triggered", triggerReason: reason });
  appendHistory(key, { stage: "ld_triggered", by: "L&D Team", note: "Reason: " + (TRIGGER_REASONS[reason] || reason) });

  const romEmail = lookupEmail(c.rom, "ROM");
  const rmEmail = lookupEmail(c.rm, "RM"); // RM is the ROM's reporting manager — CC'd for visibility
  if (romEmail) {
    MailApp.sendEmail({
      to: romEmail,
      cc: rmEmail || undefined,
      name: "Hamleys L&D",
      subject: `Action required: ${c.storeName} (${c.storeCode}) — ${TRIGGER_REASONS[reason] || reason}`,
      htmlBody: `
        <p>Hi ${c.rom},</p>
        <p>L&amp;D has flagged <strong>${c.storeName} (${c.storeCode})</strong> — score <strong>${c.score}%</strong> on ${c.date}.</p>
        <p>Reason: <strong>${TRIGGER_REASONS[reason] || reason}</strong></p>
        <p>Please log in to submit defaulter details: <a href="${DASHBOARD_BASE_URL}rom.html">${DASHBOARD_BASE_URL}rom.html</a></p>
        <p style="color:#888;font-size:12px;">Automated notification from the Hamleys Mystery Audit Intelligence dashboard.</p>
      `
    });
  } else {
    appendHistory(key, { stage: "ld_triggered", by: "System", note: `No email on file for ROM "${c.rom}" — notification not sent. Add them to the Contacts sheet.` });
  }
  return getCaseByKey(key);
}

function addEmployee(key, employee) {
  const c = getCaseByKey(key);
  if (!c) throw new Error("Case not found: " + key);
  const employees = c.employees || [];
  employees.push(Object.assign(
    { id: "emp_" + Utilities.getUuid().slice(0, 8), closed: false, closedAt: null, closedBy: null, closureNote: "" },
    employee
  ));
  updateCaseFields(key, { employeesJSON: JSON.stringify(employees) });
  return getCaseByKey(key);
}

function removeEmployee(key, employeeId) {
  const c = getCaseByKey(key);
  if (!c) throw new Error("Case not found: " + key);
  const employees = (c.employees || []).filter(e => e.id !== employeeId);
  updateCaseFields(key, { employeesJSON: JSON.stringify(employees) });
  return getCaseByKey(key);
}

function sendToHR(key) {
  const c = getCaseByKey(key);
  if (!c) throw new Error("Case not found: " + key);
  if (!c.employees || !c.employees.length) throw new Error("Add at least one employee before sending to HR");

  updateCaseFields(key, { stage: "rom_submitted" });
  appendHistory(key, { stage: "rom_submitted", by: "ROM", note: `${c.employees.length} employee(s) submitted.` });

  const hrbpEmail = lookupEmail("HRBP", "HRBP");
  const hrHeadEmail = lookupEmail("HR Head", "HR Head"); // CC'd for visibility
  if (hrbpEmail) {
    const rows = c.employees.map(e => `<tr><td>${e.name}</td><td>${e.designation}</td><td>${e.code}</td><td>${e.action}</td></tr>`).join("");
    MailApp.sendEmail({
      to: hrbpEmail,
      cc: hrHeadEmail || undefined,
      name: "Hamleys L&D",
      subject: `Action pending: ${c.storeName} (${c.storeCode}) — ${c.employees.length} employee(s)`,
      htmlBody: `
        <p>ROM <strong>${c.rom}</strong> has submitted defaulter details for <strong>${c.storeName} (${c.storeCode})</strong>.</p>
        <p>Reason: <strong>${TRIGGER_REASONS[c.triggerReason] || c.triggerReason}</strong></p>
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;">
          <tr style="background:#f0f0f0;"><th>Name</th><th>Designation</th><th>Code</th><th>Action</th></tr>
          ${rows}
        </table>
        <p>Please log in to close these out: <a href="${DASHBOARD_BASE_URL}hrbp.html">${DASHBOARD_BASE_URL}hrbp.html</a></p>
        <p style="color:#888;font-size:12px;">Automated notification from the Hamleys Mystery Audit Intelligence dashboard.</p>
      `
    });
  } else {
    appendHistory(key, { stage: "rom_submitted", by: "System", note: `No HRBP email on file — notification not sent. Add a row named "HRBP" (role "HRBP") to the Contacts sheet.` });
  }
  return getCaseByKey(key);
}

function closeEmployee(key, employeeId, closureNote) {
  const c = getCaseByKey(key);
  if (!c) throw new Error("Case not found: " + key);
  const employees = c.employees || [];
  const emp = employees.find(e => e.id === employeeId);
  if (!emp) throw new Error("Employee not found: " + employeeId);
  emp.closed = true;
  emp.closedAt = new Date().toISOString();
  emp.closedBy = "HRBP";
  emp.closureNote = closureNote || "";
  updateCaseFields(key, { employeesJSON: JSON.stringify(employees) });

  const allClosed = employees.length > 0 && employees.every(e => e.closed);
  if (allClosed) {
    updateCaseFields(key, { stage: "hrbp_closed" });
    appendHistory(key, { stage: "hrbp_closed", by: "HRBP", note: "All employee actions closed" });
  }
  return getCaseByKey(key);
}

// ---- One-off helper: run manually from the Apps Script editor (select this
// function in the toolbar dropdown, click Run) to create the Cases tab's
// header row automatically if you'd rather not type it by hand.
function setupCasesSheetHeader() {
  const sh = getSheet(CASES_SHEET);
  sh.getRange(1, 1, 1, CASES_HEADER.length).setValues([CASES_HEADER]);
}
