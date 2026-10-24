const GT_MEDIA = 'https://www.gorgany.com/media/';

const GT_FITS = [
  { id: 'regular', name: 'Regular Fit', label: 'Regular fit', img: 'wysiwyg/gorgany-ua/tables/fits/regular/jackets_Regular_fit.jpg', text: 'природний, класичний і прямий крій.' },
  { id: 'sport', name: 'Sport Fit', label: 'Sport fit', img: 'wysiwyg/gorgany-ua/tables/fits/sport/Jackets_Sport_fit.jpg', text: 'приталений крій, що щільніше прилягає до тіла.' },
  { id: 'loose', name: 'Loose Fit', label: 'Loose fit', img: 'wysiwyg/gorgany-ua/tables/fits/loose/Jackets_Loose_fit.jpg', text: 'вільний крій із запасом простору для руху та шарів одягу.' },
  { id: 'oversize', name: 'Oversize', label: 'Oversize', img: 'wysiwyg/gorgany-ua/tables/fits/oversize/Jackets_Oversize_fit.jpg', text: 'підкреслено обʼємний, вільний силует.' }
];

// відео
const GT_VIDEOS = [
  { id: 'PExJiGhOKbA', name: 'Salewa — як зняти мірки' }
];

const GT_CSS = `.gt * { margin: 0; padding: 0; }
.gt-title, .gt-sub { display: flex; justify-content: center; text-align: center; font-size: 26px; font-weight: bold; text-decoration: underline; margin-bottom: 5px; }
.gt-sub { flex-wrap: wrap; }
.gt-sub::before { content: "\\00a0"; flex: 0 0 100%; margin-bottom: 5px; text-align: center; }
.gt-sub::after { content: "\\00a0"; flex: 0 0 0; width: 0; overflow: hidden; }
.gt-sub span { font-size: 18px; }
.gt-line { width: 75%; height: 2px; border: 0; border-top: 1px solid #000; margin: 8px auto; }
.gt-text { font-size: 20px; margin: 6px 0; text-align: center; }
.gt-fits { display: flex; justify-content: center; gap: 24px; }
.gt-fits > div { text-align: center; }
.gt-video { display: table; margin-left: auto; margin-right: auto; border: 0; }
.gt::after { content: ""; display: block; height: 66px; }
.gt-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.gt-table { border-collapse: separate; border-spacing: 0; margin: 0 auto; font-size: 16px; }
.gt-table td { padding: 15px 14px; text-align: center; white-space: nowrap; border-bottom: 1px solid #e6e6e6; }
.gt-table .gt-pin { position: sticky; left: 0; z-index: 1; background: #fff; }
.gt-lines td { border-right: 1px solid #f0f0f0; }
.gt-table .gt-b { font-weight: bold; }
.gt-table .gt-i { font-style: italic; }
.gt-table .gt-u { text-decoration: underline; }
.gt-table .gt-sm { font-size: .85em; }
.gt-table .gt-lg { font-size: 1.15em; }
.gt-table .gt-xl { font-size: 1.3em; }
.gt-table .gt-l { text-align: left; }
.gt-table .gt-c { text-align: center; }
.gt-table .gt-r { text-align: right; }
.gt-table .gt-hl { background: #f5f5f5; }
.gt-note { font-size: 16px; margin-top: 10px; text-align: center; }
@media (max-width: 767px) {
  .gt-table { font-size: 12px; }
  .gt-table td { padding: 12px 8px; }
  .gt-note { font-size: 12px; }
  .gt::after { height: 55px; }
}
@media (min-width: 544px) {
  .gt-table .gt-pin { padding-right: 15px; }
}
@media (min-width: 768px) {
  .gt-table .gt-pin { padding-right: 20px; }
}
@media (max-width: 400px) {
  .gt-title, .gt-sub { text-align: left; }
  .gt-table .gt-pin { text-align: left; }
}`;

const T_DRAFT = 'tableDraft';
const T_HIST = 'tableHistory';

function tCell(t = '') {
  return { t, b: false, i: false, u: false, sz: '', al: '', hl: false };
}

function tFmtFrom(src) {
  const c = tCell();
  if (src) Object.assign(c, { b: src.b, i: src.i, sz: src.sz, al: src.al, hl: src.hl });
  return c;
}

function tNewTable(rows = 4, cols = 5) {
  const tb = { title: '', pin: true, lines: false, note: '', merges: [], cells: [] };
  for (let r = 0; r < rows; r++) tb.cells.push(Array.from({ length: cols }, () => tCell()));
  tb.cells[0].forEach(c => { c.b = true; });
  tb.cells.forEach(row => { row[0].b = true; });
  return tb;
}

function tDefault() {
  return {
    title: 'Розмірна таблиця',
    fitOn: false,
    fits: GT_FITS.map(f => f.id),
    fitMain: GT_FITS[0].id,
    fitDesc: GT_FITS[0].text,
    fitTip: 'Обирайте у своєму звичному розмірі.',
    videoOn: false,
    video: GT_VIDEOS.length ? GT_VIDEOS[0].id : '',
    tables: [tNewTable()]
  };
}

function tLoad() {
  try {
    const s = JSON.parse(localStorage.getItem(T_DRAFT));
    if (s && Array.isArray(s.tables) && s.tables.length) return Object.assign(tDefault(), s);
  } catch (e) { }
  return tDefault();
}

let gt = tLoad();
let tSel = null;
let tDrag = false;
let tTimer = null;
let tMsgTimer = null;

const tRows = tb => tb.cells.length;
const tCols = tb => tb.cells[0].length;
const tClone = o => JSON.parse(JSON.stringify(o));
const tEscText = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const tNow = () => new Date().toLocaleTimeString('uk', { hour: '2-digit', minute: '2-digit' });

function tCover(tb) {
  const map = tb.cells.map(row => row.map(() => null));
  tb.merges.forEach(m => {
    for (let r = m.r; r < m.r + m.rs; r++) {
      for (let c = m.c; c < m.c + m.cs; c++) {
        if (map[r] && c < map[r].length) map[r][c] = r === m.r && c === m.c ? { m } : 'x';
      }
    }
  });
  return map;
}

function tRect(tb, a, b) {
  let r1 = Math.min(a.r, b.r), r2 = Math.max(a.r, b.r);
  let c1 = Math.min(a.c, b.c), c2 = Math.max(a.c, b.c);
  let grow = true;
  while (grow) {
    grow = false;
    for (const m of tb.merges) {
      const mr2 = m.r + m.rs - 1, mc2 = m.c + m.cs - 1;
      if (m.r > r2 || mr2 < r1 || m.c > c2 || mc2 < c1) continue;
      if (m.r < r1) { r1 = m.r; grow = true; }
      if (mr2 > r2) { r2 = mr2; grow = true; }
      if (m.c < c1) { c1 = m.c; grow = true; }
      if (mc2 > c2) { c2 = mc2; grow = true; }
    }
  }
  return { r1, c1, r2, c2 };
}

function tFix(tb) {
  tb.merges = tb.merges.filter(m => m.rs > 0 && m.cs > 0 && m.rs * m.cs > 1);
}

function tInsRow(tb, at) {
  const ref = tb.cells[Math.max(0, Math.min(at, tRows(tb)) - 1)];
  tb.cells.splice(at, 0, ref.map(src => tFmtFrom(at === 0 ? null : src)));
  tb.merges.forEach(m => {
    if (m.r >= at) m.r++;
    else if (at < m.r + m.rs) m.rs++;
  });
}

function tDelRow(tb, at) {
  tb.merges.forEach(m => {
    if (m.r === at && m.rs > 1) tb.cells[at + 1][m.c] = tb.cells[at][m.c];
  });
  tb.cells.splice(at, 1);
  tb.merges.forEach(m => {
    if (m.r > at) m.r--;
    else if (at < m.r + m.rs) m.rs--;
  });
  tFix(tb);
}

function tInsCol(tb, at) {
  tb.cells.forEach(row => {
    const src = row[Math.max(0, Math.min(at, row.length) - 1)];
    row.splice(at, 0, tFmtFrom(at === 0 ? null : src));
  });
  tb.merges.forEach(m => {
    if (m.c >= at) m.c++;
    else if (at < m.c + m.cs) m.cs++;
  });
}

function tDelCol(tb, at) {
  tb.merges.forEach(m => {
    if (m.c === at && m.cs > 1) tb.cells[m.r][at + 1] = tb.cells[m.r][at];
  });
  tb.cells.forEach(row => row.splice(at, 1));
  tb.merges.forEach(m => {
    if (m.c > at) m.c--;
    else if (at < m.c + m.cs) m.cs--;
  });
  tFix(tb);
}

function tResize(tb, R, C) {
  R = Math.max(1, Math.min(60, Math.floor(R) || 1));
  C = Math.max(1, Math.min(30, Math.floor(C) || 1));
  while (tRows(tb) < R) tInsRow(tb, tRows(tb));
  while (tRows(tb) > R) tDelRow(tb, tRows(tb) - 1);
  while (tCols(tb) < C) tInsCol(tb, tCols(tb));
  while (tCols(tb) > C) tDelCol(tb, tCols(tb) - 1);
}

function tClean(html) {
  const box = document.createElement('div');
  box.innerHTML = html;
  const walk = node => [...node.childNodes].map(ch => {
    if (ch.nodeType === 3) return tEscText(ch.nodeValue.replace(/ /g, ' '));
    if (ch.nodeType !== 1) return '';
    const tag = ch.tagName.toLowerCase();
    if (tag === 'br') return '<br>';
    const inner = walk(ch);
    if (tag === 'b' || tag === 'strong') return inner.trim() ? `<strong>${inner}</strong>` : inner;
    if (tag === 'i' || tag === 'em') return inner.trim() ? `<em>${inner}</em>` : inner;
    if (tag === 'u') return inner.trim() ? `<u>${inner}</u>` : inner;
    if (tag === 'div' || tag === 'p') return '<br>' + inner;
    return inner;
  }).join('');
  return walk(box)
    .replace(/^(\s|<br>)+/, '')
    .replace(/(\s|<br>)+$/, '')
    .replace(/(<br>){3,}/g, '<br><br>');
}

function tFmtCls(cell, p) {
  const a = [];
  if (cell.b) a.push(p + 'b');
  if (cell.i) a.push(p + 'i');
  if (cell.u) a.push(p + 'u');
  if (cell.sz) a.push(p + cell.sz);
  if (cell.al) a.push(p + cell.al);
  if (cell.hl) a.push(p + 'hl');
  return a;
}

function tSpanAttr(k) {
  if (!k || k === 'x') return '';
  return (k.m.rs > 1 ? ` rowspan="${k.m.rs}"` : '') + (k.m.cs > 1 ? ` colspan="${k.m.cs}"` : '');
}

function tInSel(ti, r, c) {
  return !!tSel && tSel.ti === ti && r >= tSel.r1 && r <= tSel.r2 && c >= tSel.c1 && c <= tSel.c2;
}

function tGridHtml(tb, ti) {
  const cov = tCover(tb);
  return tb.cells.map((row, r) => '<tr>' + row.map((cell, c) => {
    const k = cov[r][c];
    if (k === 'x') return '';
    const cls = ['t-cell', ...tFmtCls(cell, 't-')];
    if (tb.pin && c === 0) cls.push('t-pin');
    if (tInSel(ti, r, c)) cls.push('sel');
    return `<td class="${cls.join(' ')}" data-r="${r}" data-c="${c}"${tSpanAttr(k)} contenteditable="true">${cell.t}</td>`;
  }).join('') + '</tr>').join('');
}

function tCardHtml(tb, ti) {
  const n = gt.tables.length;
  return `
  <div class="section-card t-card" data-ti="${ti}">
    <div class="section-head static">
      <div class="section-num">${ti + 2}</div>
      <input type="text" class="t-name" data-f="title" value="${esc(tb.title)}" placeholder="Підзаголовок, напр. «Жіночі розміри» (необовʼязково)">
      <div class="qa-tools">
        <button class="icon-btn" data-act="up" title="Вгору" ${ti === 0 ? 'disabled' : ''}>↑</button>
        <button class="icon-btn" data-act="down" title="Вниз" ${ti === n - 1 ? 'disabled' : ''}>↓</button>
        <button class="icon-btn" data-act="dup" title="Дублювати таблицю">⧉</button>
        <button class="icon-btn danger" data-act="del" title="Видалити таблицю" ${n === 1 ? 'disabled' : ''}>✕</button>
      </div>
    </div>
    <div class="section-body">
      <div class="t-dims">
        <div class="field narrow">
          <label>Рядків</label>
          <input type="number" min="1" max="60" data-f="rows" value="${tRows(tb)}">
        </div>
        <div class="field narrow">
          <label>Колонок</label>
          <input type="number" min="1" max="30" data-f="cols" value="${tCols(tb)}">
        </div>
        <label class="toggle-label"><input type="checkbox" data-f="pin" ${tb.pin ? 'checked' : ''}><span>Закріпити першу колонку при скролі</span></label>
        <label class="toggle-label"><input type="checkbox" data-f="lines" ${tb.lines ? 'checked' : ''}><span>Вертикальні лінії</span></label>
      </div>
      <div class="t-toolbar">
        <button data-act="b" title="Жирний"><b>B</b></button>
        <button data-act="i" title="Курсив"><i>I</i></button>
        <button data-act="u" title="Підкреслений"><u>U</u></button>
        <select data-act="sz" title="Розмір тексту">
          <option value="" disabled selected>Розмір</option>
          <option value="sm">Менший</option>
          <option value="n">Звичайний</option>
          <option value="lg">Більший</option>
          <option value="xl">Великий</option>
        </select>
        <span class="t-sep"></span>
        <button data-act="al" data-v="l" title="Ліворуч">⇤</button>
        <button data-act="al" data-v="c" title="По центру">↔</button>
        <button data-act="al" data-v="r" title="Праворуч">⇥</button>
        <button data-act="hl" title="Сірий фон клітинки">Фон</button>
        <span class="t-sep"></span>
        <button data-act="merge" title="Обʼєднати виділені клітинки">Обʼєднати</button>
        <button data-act="split" title="Розʼєднати">Розʼєднати</button>
        <span class="t-sep"></span>
        <button data-act="rowAdd" title="Додати рядок під виділенням">+ рядок</button>
        <button data-act="rowDel" title="Видалити виділені рядки">− рядок</button>
        <button data-act="colAdd" title="Додати колонку праворуч від виділення">+ колонка</button>
        <button data-act="colDel" title="Видалити виділені колонки">− колонка</button>
        <span class="t-sep"></span>
        <button data-act="clear" title="Прибрати все форматування">Очистити формат</button>
        <span class="t-selinfo"></span>
      </div>
      <div class="t-grid-wrap"><table class="t-grid">${tGridHtml(tb, ti)}</table></div>
      <div class="field">
        <label>Примітка під таблицею <span class="hint">необовʼязково</span></label>
        <input type="text" data-f="note" value="${esc(tb.note)}" placeholder="напр. Усі виміри вказано в сантиметрах">
      </div>
    </div>
  </div>`;
}

function tRenderTables() {
  $('tTables').innerHTML = gt.tables.map(tCardHtml).join('');
  tPaint();
}

function tRedraw(ti) {
  const card = document.querySelector(`.t-card[data-ti="${ti}"]`);
  if (!card) return tRenderTables();
  const tb = gt.tables[ti];
  card.querySelector('.t-grid').innerHTML = tGridHtml(tb, ti);
  card.querySelector('[data-f=rows]').value = tRows(tb);
  card.querySelector('[data-f=cols]').value = tCols(tb);
  tPaint();
}

function tPaint() {
  document.querySelectorAll('#tTables .t-card').forEach(card => {
    const ti = +card.dataset.ti;
    card.querySelectorAll('.t-cell').forEach(td => {
      td.classList.toggle('sel', tInSel(ti, +td.dataset.r, +td.dataset.c));
    });
    const info = card.querySelector('.t-selinfo');
    if (info) {
      info.textContent = tSel && tSel.ti === ti
        ? `${tSel.r2 - tSel.r1 + 1}×${tSel.c2 - tSel.c1 + 1}`
        : '';
    }
  });
}

function tSelect(ti, ar, ac, cr, cc) {
  const rect = tRect(gt.tables[ti], { r: ar, c: ac }, { r: cr, c: cc });
  tSel = { ti, ar, ac, cr, cc, ...rect };
  tPaint();
}

function tClampSel() {
  if (!tSel) return;
  const tb = gt.tables[tSel.ti];
  if (!tb || tSel.r2 >= tRows(tb) || tSel.c2 >= tCols(tb)) tSel = null;
}

function tMulti() {
  return !!tSel && (tSel.r1 !== tSel.r2 || tSel.c1 !== tSel.c2);
}

function tStatus(msg) {
  const el = $('tStatusMsg');
  el.textContent = msg;
  clearTimeout(tMsgTimer);
  tMsgTimer = setTimeout(() => { el.textContent = tWarn(); }, 2600);
}

function tNeedSel(ti) {
  if (tSel && tSel.ti === ti) return true;
  tStatus('Спершу виділи клітинки цієї таблиці');
  return false;
}

function tEach(fn) {
  const tb = gt.tables[tSel.ti];
  for (let r = tSel.r1; r <= tSel.r2; r++) {
    for (let c = tSel.c1; c <= tSel.c2; c++) fn(tb.cells[r][c], r, c);
  }
}

function tApply(ti, fn) {
  if (!tNeedSel(ti)) return;
  tEach(fn);
  tRedraw(ti);
  tChanged();
}

function tToggle(ti, key) {
  if (!tNeedSel(ti)) return;
  let all = true;
  tEach(cell => { if (!cell[key]) all = false; });
  tApply(ti, cell => { cell[key] = !all; });
}

function tInline(cmd) {
  const s = window.getSelection();
  if (!s || !s.rangeCount || s.isCollapsed) return false;
  const host = n => n && (n.nodeType === 1 ? n : n.parentElement).closest('.t-cell');
  const td = host(s.anchorNode);
  if (!td || td !== host(s.focusNode)) return false;
  document.execCommand(cmd);
  return true;
}

function tMerge(ti) {
  if (!tNeedSel(ti)) return;
  if (!tMulti()) return tStatus('Виділи щонайменше дві клітинки');
  const tb = gt.tables[ti];
  const { r1, c1, r2, c2 } = tSel;
  const texts = [];
  tEach((cell, r, c) => {
    if (cell.t.trim()) texts.push(cell.t);
    if (r !== r1 || c !== c1) cell.t = '';
  });
  tb.cells[r1][c1].t = texts.join(' ');
  tb.merges = tb.merges.filter(m => m.r < r1 || m.r > r2 || m.c < c1 || m.c > c2);
  tb.merges.push({ r: r1, c: c1, rs: r2 - r1 + 1, cs: c2 - c1 + 1 });
  tRedraw(ti);
  tChanged();
}

function tSplit(ti) {
  if (!tNeedSel(ti)) return;
  const tb = gt.tables[ti];
  const before = tb.merges.length;
  tb.merges = tb.merges.filter(m => !tInSel(ti, m.r, m.c));
  if (before === tb.merges.length) return tStatus('У виділенні немає обʼєднаних клітинок');
  tSelect(ti, tSel.r1, tSel.c1, tSel.r1, tSel.c1);
  tRedraw(ti);
  tChanged();
}

function tRowsCols(ti, act) {
  const tb = gt.tables[ti];
  const has = tSel && tSel.ti === ti;
  if (act === 'rowAdd') tInsRow(tb, has ? tSel.r2 + 1 : tRows(tb));
  if (act === 'colAdd') tInsCol(tb, has ? tSel.c2 + 1 : tCols(tb));
  if (act === 'rowDel') {
    const [a, b] = has ? [tSel.r1, tSel.r2] : [tRows(tb) - 1, tRows(tb) - 1];
    if (b - a + 1 >= tRows(tb)) return tStatus('Має лишитися хоча б один рядок');
    for (let r = b; r >= a; r--) tDelRow(tb, r);
    tSel = null;
  }
  if (act === 'colDel') {
    const [a, b] = has ? [tSel.c1, tSel.c2] : [tCols(tb) - 1, tCols(tb) - 1];
    if (b - a + 1 >= tCols(tb)) return tStatus('Має лишитися хоча б одна колонка');
    for (let c = b; c >= a; c--) tDelCol(tb, c);
    tSel = null;
  }
  tClampSel();
  tRedraw(ti);
  tChanged();
}

function tAt(td) {
  const ti = +td.closest('.t-card').dataset.ti;
  return { ti, tb: gt.tables[ti], r: +td.dataset.r, c: +td.dataset.c };
}

function tAddTable() {
  gt.tables.push(tNewTable());
  tRenderTables();
  tChanged();
  document.querySelector(`.t-card[data-ti="${gt.tables.length - 1}"]`).scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function tHasContent(tb) {
  return tb.title.trim() || tb.cells.some(row => row.some(c => c.t.trim()));
}

function tTableAct(ti, act, btn) {
  const tb = gt.tables[ti];
  if (act === 'up' || act === 'down') {
    const j = ti + (act === 'up' ? -1 : 1);
    if (j < 0 || j >= gt.tables.length) return;
    [gt.tables[ti], gt.tables[j]] = [gt.tables[j], gt.tables[ti]];
    tSel = null;
    tRenderTables();
  } else if (act === 'dup') {
    gt.tables.splice(ti + 1, 0, tClone(tb));
    tSel = null;
    tRenderTables();
  } else if (act === 'del') {
    if (gt.tables.length === 1) return;
    if (tHasContent(tb) && !confirm('Видалити цю таблицю?')) return;
    gt.tables.splice(ti, 1);
    tSel = null;
    tRenderTables();
  } else if (act === 'b' || act === 'i' || act === 'u') {
    if (tInline({ b: 'bold', i: 'italic', u: 'underline' }[act])) return;
    tToggle(ti, act);
    return;
  } else if (act === 'al') {
    const v = btn.dataset.v;
    tApply(ti, cell => { cell.al = v; });
    return;
  } else if (act === 'hl') {
    tToggle(ti, 'hl');
    return;
  } else if (act === 'merge') {
    return tMerge(ti);
  } else if (act === 'split') {
    return tSplit(ti);
  } else if (act === 'clear') {
    tApply(ti, cell => {
      Object.assign(cell, { b: false, i: false, u: false, sz: '', al: '', hl: false });
      cell.t = cell.t.replace(/<(?!br>)[^>]*>/g, '');
    });
    return;
  } else if (['rowAdd', 'rowDel', 'colAdd', 'colDel'].includes(act)) {
    return tRowsCols(ti, act);
  }
  tChanged();
}

function tPaste(e, td) {
  e.preventDefault();
  const raw = ((e.clipboardData || window.clipboardData).getData('text/plain') || '').replace(/\r/g, '');
  const body = raw.replace(/\n+$/, '');
  if (!/[\t\n]/.test(body)) {
    document.execCommand('insertText', false, body);
    return;
  }
  const { ti, tb, r, c } = tAt(td);
  const rows = body.split('\n').map(l => l.split('\t'));
  const w = Math.max(...rows.map(x => x.length));
  tResize(tb, Math.max(tRows(tb), r + rows.length), Math.max(tCols(tb), c + w));
  rows.forEach((row, i) => row.forEach((v, j) => {
    const cell = tb.cells[r + i] && tb.cells[r + i][c + j];
    if (cell) cell.t = tEscText(v.trim());
  }));
  tSelect(ti, r, c, Math.min(r + rows.length, tRows(tb)) - 1, Math.min(c + w, tCols(tb)) - 1);
  tRedraw(ti);
  tChanged();
  tStatus(`Вставлено ${rows.length}×${w}`);
}

function tCellHtml(tb, r, c, k) {
  const cell = tb.cells[r][c];
  const cls = [...(tb.pin && c === 0 ? ['gt-pin'] : []), ...tFmtCls(cell, 'gt-')];
  return `<td${cls.length ? ` class="${cls.join(' ')}"` : ''}${tSpanAttr(k)}>${cell.t}</td>`;
}

function tTableLines(tb) {
  const L = [];
  const cov = tCover(tb);
  if (tb.title.trim()) L.push(`  <div class="gt-sub"><span>${esc(tb.title.trim())}</span></div>`);
  L.push('  <div class="gt-scroll">');
  L.push(`    <table class="gt-table${tb.lines ? ' gt-lines' : ''}">`);
  L.push('      <tbody>');
  tb.cells.forEach((row, r) => L.push('        <tr>' + row
    .map((_, c) => (cov[r][c] === 'x' ? '' : tCellHtml(tb, r, c, cov[r][c])))
    .join('') + '</tr>'));
  L.push('      </tbody>', '    </table>', '  </div>');
  if (tb.note.trim()) L.push(`  <div class="gt-note">${esc(tb.note.trim())}</div>`);
  return L;
}

function tBuild(s = gt) {
  const L = ['<style>', GT_CSS, '</style>', '<div class="gt">'];
  if (s.title.trim()) L.push(`  <div class="gt-title">${esc(s.title.trim())}</div>`);
  if (s.fitOn) {
    const main = GT_FITS.find(f => f.id === s.fitMain);
    const shown = GT_FITS.filter(f => s.fits.includes(f.id));
    L.push('  <div class="gt-fit">', '    <hr class="gt-line">');
    if (main) {
      const desc = s.fitDesc.trim();
      L.push(`    <div class="gt-text">Крій <strong>${main.label}</strong>${desc ? ' - ' + esc(desc) : ''}</div>`);
    }
    if (s.fitTip.trim()) L.push(`    <div class="gt-text">${esc(s.fitTip.trim())}</div>`);
    if (shown.length) {
      L.push('    <div class="gt-text gt-fits">');
      shown.forEach(f => {
        const big = f.id === s.fitMain;
        const px = big ? 180 : 150;
        L.push(`      <div><img src="{{media url="${f.img}"}}" alt="${f.name}" width="${px}" height="${px}"><div>${big ? `<strong>${f.name}</strong>` : f.name}</div></div>`);
      });
      L.push('    </div>');
    }
    L.push('    <hr class="gt-line">', '  </div>');
  }
  const video = s.videoOn && GT_VIDEOS.find(v => v.id === s.video);
  if (video) {
    L.push(`  <iframe class="gt-video" src="https://www.youtube.com/embed/${video.id}" title="${esc(video.name)}" width="700" height="500" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen="allowfullscreen"></iframe>`);
  }
  s.tables.forEach(tb => L.push(...tTableLines(tb)));
  L.push('</div>');
  return L.join('\n');
}

function tWarn() {
  if (gt.fitOn && !gt.fits.length) return 'Крій увімкнено, але жодного фото не вибрано';
  return '';
}

function tPreviewDoc(html) {
  const body = html.replace(/\{\{media url="([^"]+)"\}\}/g, (m, p) => GT_MEDIA + p);
  return '<!DOCTYPE html><html lang="uk"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<style>*{box-sizing:border-box}body{margin:0;padding:16px 15px;background:#fff;color:#333;' +
    'font:14px/1.42857 "MuseoSans",Helvetica,Arial,sans-serif}img{max-width:100%;height:auto;border:0}</style>' +
    '</head><body>' + body + '</body></html>';
}

function tFitPreviewHeight() {
  const fr = $('tPreview');
  try {
    const d = fr.contentDocument;
    if (d && d.body) fr.style.height = Math.max(160, d.documentElement.scrollHeight) + 'px';
  } catch (e) { }
}

function tUpdateOut() {
  const html = tBuild();
  const out = $('tOutput');
  out.textContent = html;
  out.classList.remove('output-empty');
  $('tPreview').srcdoc = tPreviewDoc(html);
  $('tStatusMsg').textContent = tWarn();
}

function tChanged() {
  clearTimeout(tTimer);
  tTimer = setTimeout(() => {
    try { localStorage.setItem(T_DRAFT, JSON.stringify(gt)); } catch (e) { }
    tUpdateOut();
  }, 350);
}

function tRenderFits() {
  $('tFits').innerHTML = GT_FITS.map(f => {
    const on = gt.fits.includes(f.id);
    const main = gt.fitMain === f.id;
    return `
    <div class="t-fit${main ? ' main' : ''}${on ? '' : ' hidden-fit'}">
      <img src="${GT_MEDIA + f.img}" alt="${f.name}">
      <span class="t-fit-name">${f.name}</span>
      <div class="t-fit-opts">
        <label class="toggle-label"><input type="checkbox" data-fit="${f.id}" ${on ? 'checked' : ''}><span>Показувати</span></label>
        <label class="toggle-label"><input type="radio" name="tFitMain" value="${f.id}" ${main ? 'checked' : ''}><span>Основний</span></label>
      </div>
    </div>`;
  }).join('');
}

function tSetMain(id) {
  gt.fitMain = id;
  const f = GT_FITS.find(x => x.id === id);
  if (f) {
    gt.fitDesc = f.text;
    $('tFitDesc').value = f.text;
  }
}

function tRenderVideos() {
  const sel = $('tVideo');
  if (!GT_VIDEOS.length) {
    sel.innerHTML = '<option value="">Список відео порожній</option>';
    sel.disabled = true;
    return;
  }
  sel.disabled = false;
  sel.innerHTML = GT_VIDEOS.map(v => `<option value="${esc(v.id)}">${esc(v.name)}</option>`).join('');
  if (!GT_VIDEOS.some(v => v.id === gt.video)) gt.video = GT_VIDEOS[0].id;
  sel.value = gt.video;
}

function tSyncHead() {
  $('tTitle').value = gt.title;
  $('tFitOn').checked = gt.fitOn;
  $('tFitDesc').value = gt.fitDesc;
  $('tFitTip').value = gt.fitTip;
  $('tVideoOn').checked = gt.videoOn;
  $('tFitBox').classList.toggle('t-off', !gt.fitOn);
  $('tVideoBox').classList.toggle('t-off', !gt.videoOn);
  tRenderFits();
  tRenderVideos();
}

function tRenderAll() {
  tSyncHead();
  tRenderTables();
  tUpdateOut();
}

function tSample() {
  const data = [
    ['Розмір INT', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'],
    ['Розмір FR', '34', '36', '38', '40', '42', '44', '46', '48'],
    ['Розмір UK', '4', '6', '8', '10', '12', '14', '16', '18'],
    ['Зріст', '160-163', '162-165', '164-167', '168-171', '170-173', '172-175', '174-177', '176-179'],
    ['Обхват шиї', '34', '35', '36', '37', '38', '39', '40', '41'],
    ['Ширина плечей', '36', '37', '38', '39', '40', '41', '42', '43'],
    ['Обхват грудей', '82-85', '86-89', '90-93', '94-97', '98-101', '102-105', '106-109', '110-113'],
    ['Обхват талії', '58-61', '62-65', '66-69', '70-73', '74-77', '78-81', '82-85', '86-89'],
    ['Обхват стегон', '86-89', '90-93', '94-97', '98-101', '102-105', '106-109', '110-113', '114-117'],
    ['Довжина руки', '73,5', '75', '77,5', '79', '80,5', '83', '84,5', '86'],
    ['Довжина ноги (від талії)', '101-104', '102-105', '103-106', '104-107', '105-108', '106-109', '107-110', '108-111']
  ];
  const tb = tNewTable(data.length, data[0].length);
  tb.title = 'Жіночі розміри';
  data.forEach((row, r) => row.forEach((v, c) => { tb.cells[r][c].t = tEscText(v); }));
  tb.cells[0][0].u = true;
  return Object.assign(tDefault(), {
    title: 'Розмірна таблиця Salewa',
    fitOn: true,
    videoOn: GT_VIDEOS.length > 0,
    tables: [tb]
  });
}

function tLoadSample() {
  if (gt.tables.some(tHasContent) && !confirm('Замінити поточні таблиці прикладом?')) return;
  gt = tSample();
  tSel = null;
  tRenderAll();
  tChanged();
}

function tReset() {
  if (!confirm('Очистити всі поля вкладки «Таблиці»?')) return;
  gt = tDefault();
  tSel = null;
  tRenderAll();
  tChanged();
}

function tHist() {
  try { return JSON.parse(localStorage.getItem(T_HIST) || '[]'); }
  catch (e) { return []; }
}

function tSaveHistory() {
  const h = tHist();
  const name = [gt.title.trim(), ...gt.tables.map(t => t.title.trim()).filter(Boolean)].join(' · ') || 'Таблиця без назви';
  h.unshift({ name, time: tNow(), state: tClone(gt) });
  if (h.length > 5) h.length = 5;
  try { localStorage.setItem(T_HIST, JSON.stringify(h)); } catch (e) { }
  tRenderHistory();
}

function tRenderHistory() {
  const h = tHist();
  $('tHistorySection').style.display = h.length ? '' : 'none';
  $('tHistoryList').innerHTML = h.map((e, i) => `
    <div class="history-item">
      <div class="history-item-info" onclick="tLoadHistory(${i})" title="Відкрити в редакторі">
        <span class="history-item-name">${esc(e.name)}</span>
        <span class="history-item-time">${e.time}</span>
      </div>
      <button class="copy-btn" id="tHCopy${i}" onclick="tCopyHistory(${i})">Копіювати</button>
    </div>`).join('');
}

function tLoadHistory(i) {
  const e = tHist()[i];
  if (!e) return;
  gt = Object.assign(tDefault(), tClone(e.state));
  tSel = null;
  tRenderAll();
  tChanged();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function tCopyHistory(i) {
  const e = tHist()[i];
  if (!e) return;
  navigator.clipboard.writeText(tBuild(Object.assign(tDefault(), e.state))).then(() => flashBtn($(`tHCopy${i}`)));
}

function tClearHistory() {
  localStorage.removeItem(T_HIST);
  tRenderHistory();
}

function tCopy() {
  clearTimeout(tTimer);
  tUpdateOut();
  navigator.clipboard.writeText($('tOutput').textContent).then(() => {
    flashBtn($('tCopyBtn'));
    tStatus('Готово до вставки в Magento');
    tSaveHistory();
  });
}

function tInitEvents() {
  const wrap = $('tTables');

  wrap.addEventListener('mousedown', e => {
    if (e.target.closest('.t-toolbar button')) { e.preventDefault(); return; }
    const td = e.target.closest('.t-cell');
    if (!td) return;
    const { ti, r, c } = tAt(td);
    if (e.shiftKey && tSel && tSel.ti === ti) {
      e.preventDefault();
      tSelect(ti, tSel.ar, tSel.ac, r, c);
      return;
    }
    tSelect(ti, r, c, r, c);
    tDrag = true;
  });

  wrap.addEventListener('mouseover', e => {
    if (!tDrag || !tSel) return;
    const td = e.target.closest('.t-cell');
    if (!td) return;
    const { ti, r, c } = tAt(td);
    if (ti !== tSel.ti || (r === tSel.cr && c === tSel.cc)) return;
    tSelect(ti, tSel.ar, tSel.ac, r, c);
    if (tMulti()) {
      td.closest('.t-grid').classList.add('t-multi');
      window.getSelection().removeAllRanges();
      if (document.activeElement && document.activeElement.classList.contains('t-cell')) document.activeElement.blur();
    }
  });

  window.addEventListener('mouseup', () => {
    tDrag = false;
    document.querySelectorAll('.t-grid.t-multi').forEach(g => g.classList.remove('t-multi'));
  });

  document.addEventListener('mousedown', e => {
    if (tSel && activeTab() === 'table' && !e.target.closest('#tTables, #tOutputSection')) {
      tSel = null;
      tPaint();
    }
  });

  wrap.addEventListener('focusin', e => {
    const td = e.target.closest('.t-cell');
    if (!td || tDrag) return;
    const { ti, r, c } = tAt(td);
    if (!tInSel(ti, r, c)) tSelect(ti, r, c, r, c);
  });

  wrap.addEventListener('input', e => {
    const td = e.target.closest('.t-cell');
    if (td) {
      const { tb, r, c } = tAt(td);
      tb.cells[r][c].t = tClean(td.innerHTML);
      tChanged();
      return;
    }
    const f = e.target.dataset.f;
    if (f === 'title' || f === 'note') {
      gt.tables[+e.target.closest('.t-card').dataset.ti][f] = e.target.value;
      tChanged();
    }
  });

  wrap.addEventListener('change', e => {
    const el = e.target;
    const card = el.closest('.t-card');
    if (!card) return;
    const ti = +card.dataset.ti;
    const tb = gt.tables[ti];
    const f = el.dataset.f;
    if (f === 'rows' || f === 'cols') {
      tResize(tb, f === 'rows' ? +el.value : tRows(tb), f === 'cols' ? +el.value : tCols(tb));
      tClampSel();
      tRedraw(ti);
      tChanged();
    } else if (f === 'pin' || f === 'lines') {
      tb[f] = el.checked;
      tRedraw(ti);
      tChanged();
    } else if (el.dataset.act === 'sz') {
      const v = el.value === 'n' ? '' : el.value;
      el.selectedIndex = 0;
      tApply(ti, cell => { cell.sz = v; });
    }
  });

  wrap.addEventListener('click', e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn || btn.disabled) return;
    tTableAct(+btn.closest('.t-card').dataset.ti, btn.dataset.act, btn);
  });

  wrap.addEventListener('paste', e => {
    const td = e.target.closest('.t-cell');
    if (td) tPaste(e, td);
  });

  document.addEventListener('keydown', e => {
    if (activeTab() !== 'table' || !tMulti()) return;
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      tApply(tSel.ti, cell => { cell.t = ''; });
    }
  });

  $('tTitle').addEventListener('input', e => { gt.title = e.target.value; tChanged(); });
  $('tFitDesc').addEventListener('input', e => { gt.fitDesc = e.target.value; tChanged(); });
  $('tFitTip').addEventListener('input', e => { gt.fitTip = e.target.value; tChanged(); });
  $('tVideo').addEventListener('change', e => { gt.video = e.target.value; tChanged(); });

  $('tFitOn').addEventListener('change', e => {
    gt.fitOn = e.target.checked;
    $('tFitBox').classList.toggle('t-off', !gt.fitOn);
    tChanged();
  });

  $('tVideoOn').addEventListener('change', e => {
    gt.videoOn = e.target.checked;
    $('tVideoBox').classList.toggle('t-off', !gt.videoOn);
    tChanged();
  });

  $('tFits').addEventListener('change', e => {
    const el = e.target;
    const order = GT_FITS.map(f => f.id);
    if (el.dataset.fit) {
      const id = el.dataset.fit;
      const set = new Set(gt.fits);
      el.checked ? set.add(id) : set.delete(id);
      gt.fits = order.filter(x => set.has(x));
      if (!el.checked && gt.fitMain === id) tSetMain(gt.fits[0] || '');
      if (el.checked && !gt.fitMain) tSetMain(id);
    } else if (el.name === 'tFitMain') {
      tSetMain(el.value);
      if (!gt.fits.includes(el.value)) gt.fits = order.filter(x => x === el.value || gt.fits.includes(x));
    }
    tRenderFits();
    tChanged();
  });

  document.querySelectorAll('#tsecPrev [data-pv]').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('#tsecPrev [data-pv]').forEach(x => x.classList.toggle('active', x === b));
    $('tPreview').classList.toggle('mobile', b.dataset.pv === 'mob');
    setTimeout(tFitPreviewHeight, 260);
  }));

  $('tPreview').addEventListener('load', () => {
    tFitPreviewHeight();
    setTimeout(tFitPreviewHeight, 600);
  });
}

try { document.execCommand('styleWithCSS', false, false); } catch (e) { }
tInitEvents();
tRenderAll();
tRenderHistory();
