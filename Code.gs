const SHEET_NAME = 'log';
const HEAD = ['Дата', 'Час', 'Партія', 'Товар', 'Слуг', 'Статус', 'Фото', 'Товарів у партії'];

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
    else res = { ok: true, sheet: SHEET_NAME, rows: Math.max(0, getSheet().getLastRow() - 1) };
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
      sh.getRange(sh.getLastRow() + 1, 1, rows.length, HEAD.length).setValues(rows);
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

function dropBatch(sh, batch) {
  const last = sh.getLastRow();
  if (last < 2) return;
  const col = sh.getRange(2, 3, last - 1, 1).getValues();
  for (let i = col.length - 1; i >= 0; i--) {
    if (String(col[i][0]) === String(batch)) sh.deleteRow(i + 2);
  }
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
