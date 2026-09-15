// ============================================================
// ES Print Customer Clearing House
// Google Apps Script Web App — Code.gs
// ============================================================
// SETUP:
// 1. Go to script.google.com → New project
// 2. Create Code.gs (this file) and index.html (the other file)
// 3. Deploy → New deployment → Web app
//    - Execute as: Me
//    - Who has access: Anyone
// 4. Share the Web App URL to all branches
// ============================================================

var SHEET_TAB = 'CLIENT DATABASE';

// ⚙️ BRANCH CONFIGURATIONS - Set your Google Sheet URLs here
var BRANCHES = {
  'NORTH MINDANAO': '',
  'SOUTH LUZON': '',
  'VISAYAS': '',
  'NORTH LUZON': '',
  'SOUTH MINDANAO': ''
};

// Default branch (first one used when app loads)
var BRANCH_NAME = '';
var SHARED_SHEET_URL = '';

// Map: internal key → exact column header in your Google Sheet
var COL_MAP = {
  'date':    'ENCODE / UPDATE DATE',
  'name':    'COMPANY NAME',
  'ae_full': 'AE',
  'tl':      'TL',
  'sm_full': 'SM',
  'address': 'ADDRESS',
  'city':    'CITY',
  'province':'PROVINCE',
  'contact': 'CONTACT PERSON 1',
  'contact2':'CONTACT PERSON 2',
  'position2':'POSITION 2',
  'phone':   'CONTACT NUMBER 1',
  'phone2':  'CONTACT NUMBER 2',
  'phone3':  'CONTACT NUMBER 3',
  'phone4':  'CONTACT NUMBER 4',
  'email':   'EMAIL 1',
  'alt_email':'EMAIL 2',
  'email2':  'EMAIL 2',
  'email3':  'EMAIL 3',
  'first_contact':'FIRST CONTACT',
  'lead_source':'LEAD SOURCE',
  'notes':   'NOTES',
  'inquiry': 'INQUIRY',
  'id':      'ID'
};

var FIELDS = Object.keys(COL_MAP);

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('ES Print — Customer Clearing House')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Return shared configuration & synced users to frontend
function getSharedConfig() {
  var users = null;
  try {
    var stored = PropertiesService.getScriptProperties().getProperty('USER_CREDENTIALS');
    if (stored) users = JSON.parse(stored);
  } catch(e) {}

  return {
    branch: BRANCH_NAME,
    sheetUrl: SHARED_SHEET_URL,
    branches: BRANCHES,
    users: users
  };
}

function syncUserAccounts(accounts) {
  try {
    PropertiesService.getScriptProperties().setProperty('USER_CREDENTIALS', JSON.stringify(accounts));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function getAppVersion() {
  try {
    var scriptId = ScriptApp.getProjectKey ? ScriptApp.getProjectKey() : ScriptApp.getScriptId();
    var file = DriveApp.getFileById(scriptId);
    return { ok: true, version: file.getLastUpdated().toISOString() };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ---- Helper: open sheet by URL ----
function openSheet(sheetUrl) {
  var m = sheetUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  var sheetId = m ? m[1] : sheetUrl.trim();
  var ss = SpreadsheetApp.openById(sheetId);

  // 1. Try to match by gid in the URL (most reliable for multi-tab sheets)
  var gidMatch = sheetUrl.match(/[?&#]gid=(\d+)/);
  if (gidMatch) {
    var gid = parseInt(gidMatch[1], 10);
    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) {
      if (sheets[i].getSheetId() === gid) return sheets[i];
    }
  }

  // 2. Fallback: try named tab
  var byName = ss.getSheetByName(SHEET_TAB);
  if (byName) return byName;

  // 3. Last resort: first tab
  return ss.getSheets()[0];
}

// ---- Helper: build column index ----
function normalizeHeaderName(name) {
  return String(name||'').trim().toUpperCase().replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}

function getColIdx(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return {};
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var idx = {};
  headers.forEach(function(h, i) {
    var raw = String(h||'').trim();
    var normalized = normalizeHeaderName(raw);
    if (raw) idx[raw.toUpperCase()] = i;
    if (normalized) idx[normalized] = i;
  });
  return idx;
}

function findHeaderIndex(colIdx, key) {
  var target = String((COL_MAP[key] || key) || '').trim().toUpperCase();
  if (colIdx[target] !== undefined) return colIdx[target];
  var normTarget = normalizeHeaderName(target);
  if (normTarget && colIdx[normTarget] !== undefined) return colIdx[normTarget];
  // fallback to partial matching if exact header isn't found
  for (var header in colIdx) {
    if (!colIdx.hasOwnProperty(header)) continue;
    if (header.indexOf(normTarget) !== -1) return colIdx[header];
    if (normTarget.indexOf(header) !== -1) return colIdx[header];
  }
  return undefined;
}

// ---- Helper: ensure ID column exists ----
function ensureId(sheet, colIdx) {
  var key = 'ID';
  if (colIdx[key] !== undefined) return colIdx;
  var newCol = sheet.getLastColumn() + 1;
  sheet.getRange(1, newCol).setValue('ID');
  colIdx[key] = newCol - 1;
  return colIdx;
}

// ---- Helper: row → object ----
function rowToObj(row, colIdx) {
  var obj = {};
  FIELDS.forEach(function(f) {
    var ci = findHeaderIndex(colIdx, f);
    obj[f] = (ci !== undefined && row[ci] !== undefined) ? String(row[ci]) : '';
  });
  if (!obj.alt_email && obj.email2) obj.alt_email = obj.email2;
  if (!obj.email2 && obj.alt_email) obj.email2 = obj.alt_email;
  return obj;
}

// ---- Helper: object → row array ----
function objToRow(obj, colIdx, totalCols) {
  var row = new Array(totalCols).fill('');
  var writtenCols = {};
  FIELDS.forEach(function(f) {
    var ci = findHeaderIndex(colIdx, f);
    if (ci !== undefined) {
      var val = (obj[f] !== undefined && obj[f] !== null) ? String(obj[f]).trim() : '';
      if (val !== '' || !writtenCols[ci]) {
        row[ci] = obj[f] || '';
        if (val !== '') writtenCols[ci] = true;
      }
    }
  });
  return row;
}

// ---- Helper: make ID ----
function makeId() {
  return 'c_' + new Date().getTime().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
}

// ============================================================
// API functions called via google.script.run from HTML
// ============================================================

function getAllCustomers(sheetUrl) {
  try {
    var sheet  = openSheet(sheetUrl);
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 2) return { ok: true, customers: [] };

    var colIdx = getColIdx(sheet);
    colIdx = ensureId(sheet, colIdx);

    var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    var customers = [];
    var nameCI = colIdx['COMPANY NAME'];
    var idCI   = colIdx['ID'];

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (nameCI !== undefined && String(row[nameCI] || '').trim() === '') continue;
      var obj = rowToObj(row, colIdx);
      obj.status = obj.status || 'Active';
      obj.type   = obj.type   || 'Corporate';
      if (!obj.id || obj.id.trim() === '') {
        obj.id = makeId();
        if (idCI !== undefined) sheet.getRange(i + 2, idCI + 1).setValue(obj.id);
      }
      customers.push(obj);
    }
    SpreadsheetApp.flush();
    return { ok: true, customers: customers };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

function saveCustomer(sheetUrl, customer) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Wait up to 10 seconds for locks held by other requests
    var sheet  = openSheet(sheetUrl);
    var colIdx = getColIdx(sheet);
    colIdx = ensureId(sheet, colIdx);
    var totalCols = sheet.getLastColumn();
    if (!customer.id) customer.id = makeId();
    sheet.appendRow(objToRow(customer, colIdx, totalCols));
    SpreadsheetApp.flush();
    return { ok: true, id: customer.id };
  } catch(e) {
    return { ok: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

function updateCustomer(sheetUrl, customer) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet  = openSheet(sheetUrl);
    var colIdx = getColIdx(sheet);
    colIdx = ensureId(sheet, colIdx);
    var totalCols = sheet.getLastColumn();
    var idCI  = colIdx['ID'];
    var data  = sheet.getDataRange().getValues();
    var rowNum = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idCI] || '').trim() === String(customer.id).trim()) {
        rowNum = i + 1; break;
      }
    }
    var newRow = objToRow(customer, colIdx, totalCols);
    if (rowNum < 0) { sheet.appendRow(newRow); }
    else { sheet.getRange(rowNum, 1, 1, totalCols).setValues([newRow]); }
    SpreadsheetApp.flush();
    return { ok: true, id: customer.id };
  } catch(e) {
    return { ok: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

function deleteCustomer(sheetUrl, id) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet  = openSheet(sheetUrl);
    var colIdx = getColIdx(sheet);
    var idCI   = colIdx['ID'];
    if (idCI === undefined) return { ok: false, error: 'No ID column' };
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idCI] || '').trim() === String(id).trim()) {
        sheet.deleteRow(i + 1);
        SpreadsheetApp.flush();
        return { ok: true };
      }
    }
    return { ok: false, error: 'Record not found' };
  } catch(e) {
    return { ok: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}
