const LOG_URL_KEY = 'photoLogUrl';
const LOG_QUEUE_KEY = 'photoLogQueue';
const LOG_MAX = 20;
const JSONP_TIMEOUT = 20000;
const CHUNK_CHARS = 1200;

const STATUS_LABEL = { approved: 'Погоджено', rejected: 'Відхилено', pending: 'Без рішення' };

function normLogUrl(v) {
  let u = (v || '').trim();
  if (!u) return '';
  u = u.replace(/[?#].*$/, '').replace(/\/+$/, '');
  if (!/\/(exec|dev)$/.test(u)) u += '/exec';
  return u;
}

function logUrl() {
  return normLogUrl(localStorage.getItem(LOG_URL_KEY));
}

function logQueue() {
  try { return JSON.parse(localStorage.getItem(LOG_QUEUE_KEY) || '[]'); }
  catch (e) { return []; }
}

function saveLogQueue(q) {
  if (q.length > LOG_MAX) q.length = LOG_MAX;
  localStorage.setItem(LOG_QUEUE_KEY, JSON.stringify(q));
}

function batchRows(batch) {
  return batch.items.map(it => [
    batch.date,
    batch.time,
    batch.id,
    it.name,
    it.slug,
    STATUS_LABEL[it.status] || it.status,
    it.photos,
    batch.total
  ]);
}

let jsonpSeq = 0;

function jsonp(base, params) {
  return new Promise((resolve, reject) => {
    const cb = 'lcb' + (++jsonpSeq) + '_' + Date.now();
    const s = document.createElement('script');
    const q = new URLSearchParams(Object.assign({ callback: cb }, params));
    const timer = setTimeout(() => { done(); reject(new Error('timeout')); }, JSONP_TIMEOUT);
    function done() {
      clearTimeout(timer);
      try { delete window[cb]; } catch (e) { window[cb] = undefined; }
      if (s.parentNode) s.parentNode.removeChild(s);
    }
    window[cb] = data => { done(); resolve(data); };
    s.onerror = () => { done(); reject(new Error('network')); };
    s.src = base + '?' + q.toString();
    document.head.appendChild(s);
  });
}

async function postRows(url, entry) {
  const body = JSON.stringify({ batch: entry.id, rows: entry.rows });
  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body
    });
  } catch (e) { /* тихо */ }
}

function chunkRows(rows) {
  const out = [];
  let cur = [];
  for (const r of rows) {
    const next = cur.concat([r]);
    if (cur.length && encodeURIComponent(JSON.stringify(next)).length > CHUNK_CHARS) {
      out.push(cur);
      cur = [r];
    } else {
      cur = next;
    }
  }
  if (cur.length) out.push(cur);
  return out;
}

async function getRows(url, entry) {
  const parts = chunkRows(entry.rows);
  for (let i = 0; i < parts.length; i++) {
    await jsonp(url, { w: '1', batch: entry.id, part: String(i), rows: JSON.stringify(parts[i]) });
  }
}

async function verifyBatch(url, entry) {
  try {
    const j = await jsonp(url, { check: entry.id });
    return j && j.ok === true && j.rows === entry.rows.length;
  } catch (e) {
    return false;
  }
}

async function sendLogEntry(entry) {
  const url = logUrl();
  if (!url) return false;
  await postRows(url, entry);
  if (await verifyBatch(url, entry)) return true;
  try { await getRows(url, entry); } catch (e) { return false; }
  return await verifyBatch(url, entry);
}

async function pushBatchLog(batch) {
  const q = logQueue();
  const entry = {
    id: batch.id,
    date: batch.date,
    time: batch.time,
    total: batch.total,
    rows: batchRows(batch),
    sent: false
  };
  const i = q.findIndex(e => e.id === entry.id);
  if (i >= 0) q[i] = entry; else q.unshift(entry);
  saveLogQueue(q);
  renderLogList();

  const msg = $('pLogMsg');
  if (!logUrl()) {
    if (msg) { msg.textContent = 'Лог збережено локально — вкажи адресу таблиці в налаштуваннях'; msg.className = 'msg'; }
    return;
  }
  if (msg) { msg.textContent = 'Надсилаю лог…'; msg.className = 'msg'; }
  const ok = await sendLogEntry(entry);
  markSent(entry.id, ok);
  if (msg) {
    msg.textContent = ok
      ? 'Лог у таблиці — ' + entry.rows.length + ' ряд. підтверджено'
      : 'Таблиця не підтвердила запис — партія лишилась у черзі';
    msg.className = ok ? 'msg' : 'msg err';
  }
}

function markSent(id, ok) {
  const q = logQueue();
  const e = q.find(x => x.id === id);
  if (e) e.sent = ok;
  saveLogQueue(q);
  renderLogList();
}

async function retryLog() {
  const btn = $('pLogRetry');
  const pending = logQueue().filter(e => !e.sent);
  if (!pending.length) return;
  if (!logUrl()) { flashBtn(btn, 'Немає адреси'); return; }
  btn.disabled = true;
  const label = btn.textContent;
  btn.textContent = 'Надсилаю…';
  let done = 0;
  for (const e of pending) {
    const ok = await sendLogEntry(e);
    markSent(e.id, ok);
    if (ok) done++;
  }
  btn.disabled = false;
  btn.textContent = label;
  flashBtn(btn, done + ' з ' + pending.length);
}

function renderLogList() {
  const list = $('pLogList');
  if (!list) return;
  const q = logQueue();
  const pending = q.filter(e => !e.sent).length;
  $('pLogRetry').disabled = pending === 0;
  $('pLogPending').textContent = pending ? pending + ' у черзі' : 'черга порожня';
  if (!q.length) {
    list.innerHTML = '<div class="import-hint">Ще нічого не оброблено.</div>';
    return;
  }
  list.innerHTML = q.slice(0, 8).map(e => `
    <div class="log-item">
      <span class="log-when">${e.date} ${e.time}</span>
      <span>${e.total} тов.</span>
      <span class="spacer"></span>
      <span class="log-badge ${e.sent ? 'sent' : 'wait'}">${e.sent ? 'У таблиці' : 'У черзі'}</span>
    </div>
  `).join('');
}

async function testLogUrl() {
  const btn = $('pLogTest');
  const out = $('pLogTestMsg');
  const url = logUrl();
  if (!url) { out.textContent = 'Спочатку встав адресу'; out.className = 'msg err'; return; }
  btn.disabled = true;
  out.textContent = 'Перевіряю…';
  out.className = 'msg';
  try {
    const j = await jsonp(url, { ping: '1' });
    out.textContent = j && j.ok
      ? 'Звʼязок є · аркуш «' + j.sheet + '» · рядків: ' + j.rows
      : 'Скрипт відповів помилкою: ' + ((j && j.error) || '—');
    out.className = j && j.ok ? 'msg' : 'msg err';
  } catch (e) {
    out.textContent = e.message === 'timeout'
      ? 'Немає відповіді. Перевір, що доступ у деплої — «Anyone», і що це свіжий деплой'
      : 'Адреса недоступна. Перевір, що вона закінчується на /exec';
    out.className = 'msg err';
  }
  btn.disabled = false;
}

function initLog() {
  const f = $('pLogUrl');
  if (!f) return;
  f.value = logUrl();
  f.addEventListener('change', () => {
    const u = normLogUrl(f.value);
    localStorage.setItem(LOG_URL_KEY, u);
    f.value = u;
    $('pLogTestMsg').textContent = '';
    renderLogList();
  });
  $('pLogTest').addEventListener('click', testLogUrl);
  $('pLogRetry').addEventListener('click', retryLog);
  renderLogList();
}

initLog();