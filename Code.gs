const SHEET_NAME = 'log';
const HEAD = ['Дата', 'Час', 'Партія', 'Товар', 'Слуг', 'Статус', 'Фото', 'Товарів у партії'];
const SEP_COLS = 20;
const SEP_COLOR = '#c5222a';
const SEP_MARK = ' ';

function doPost(e) {
  let res;
  try {
    const data = JSON.parse(e.postData.contents);
    res = writeBatch(data.batch, data.rows, true);
  } catch (err) {
    res = { ok: false, error: String(err) };
  }
  return out(res);
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  let res;
  try {
    if (p.w === '1') res = writeBatch(p.batch, JSON.parse(p.rows), p.part === '0');
    else if (p.check) res = { ok: true, batch: p.check, rows: countBatch(p.check) };
    else res = { ok: true, sheet: SHEET_NAME, rows: dataRows() };
  } catch (err) {
    res = { ok: false, error: String(err) };
  }
  const cb = p.callback;
  return cb && /^[A-Za-z0-9_]+$/.test(cb) ? jsonpOut(cb, res) : out(res);
}

function writeBatch(batch, rows, replace) {
  if (!batch || !Array.isArray(rows)) return { ok: false, error: 'bad payload' };
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = getSheet();
    if (replace) dropBatch(sh, batch);
    if (rows.length) {
      ensureRows(sh, rows.length + 2);
      prepareTail(sh, batch);
      sh.getRange(sh.getLastRow() + 1, 1, rows.length, HEAD.length).setValues(rows);
      addSeparator(sh);
    }
    return { ok: true, batch: batch, rows: countBatch(batch) };
  } finally {
    lock.releaseLock();
  }
}

function countBatch(batch) {
  const sh = getSheet();
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const col = sh.getRange(2, 3, last - 1, 1).getValues();
  let n = 0;
  for (let i = 0; i < col.length; i++) if (String(col[i][0]) === String(batch)) n++;
  return n;
}

function dataRows() {
  const sh = getSheet();
  const last = sh.getLastRow();
  if (last < 2) return 0;
  return sh.getRange(2, 3, last - 1, 1).getValues().filter(r => String(r[0]) !== '').length;
}

function dropBatch(sh, batch) {
  const last = sh.getLastRow();
  if (last < 2) return;
  const vals = sh.getRange(2, 1, last - 1, HEAD.length).getValues();
  for (let i = vals.length - 1; i >= 0; i--) {
    if (!sameBatch(vals[i], batch)) continue;
    if (vals[i + 1] && isSep(vals[i + 1])) sh.deleteRow(i + 3);
    sh.deleteRow(i + 2);
  }
}

function prepareTail(sh, batch) {
  const last = sh.getLastRow();
  if (last < 2) return;
  const from = Math.max(2, last - 1);
  const tail = sh.getRange(from, 1, last - from + 1, HEAD.length).getValues();
  const end = tail[tail.length - 1];
  const prev = tail.length > 1 ? tail[0] : null;
  if (isSep(end)) {
    if (prev && sameBatch(prev, batch)) sh.deleteRow(last);
  } else if (!sameBatch(end, batch)) {
    addSeparator(sh);
  }
}

function addSeparator(sh) {
  const r = sh.getLastRow() + 1;
  sh.getRange(r, 1).setValue(SEP_MARK);
  sh.getRange(r, 1, 1, SEP_COLS).setBackground(SEP_COLOR);
}

function ensureRows(sh, n) {
  const max = sh.getMaxRows();
  const need = sh.getLastRow() + n - max;
  if (need <= 0) return;
  sh.insertRowsAfter(max, need);
  sh.getRange(max + 1, 1, need, sh.getMaxColumns()).clearFormat();
}

function isSep(row) {
  return row.every(v => String(v).trim() === '');
}

function sameBatch(row, batch) {
  return String(row[2]) === String(batch);
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.setColumnWidth(3, 160);
    sh.setColumnWidth(4, 260);
    sh.setColumnWidth(5, 200);
  }
  return sh;
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonpOut(cb, obj) {
  return ContentService.createTextOutput(cb + '(' + JSON.stringify(obj) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}