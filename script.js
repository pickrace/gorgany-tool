const $ = id => document.getElementById(id);

function g(id) {
  return ($(id) || {}).value || '';
}

function esc(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function flashBtn(btn, okText) {
  if (!btn) return;
  if (!btn.dataset.orig) btn.dataset.orig = btn.textContent;
  btn.textContent = okText || '✓ Скопійовано!';
  btn.classList.add('ok');
  setTimeout(() => {
    btn.textContent = btn.dataset.orig;
    btn.classList.remove('ok');
  }, 2500);
}

function download(blob, filename) {
  const a = document.createElement('a');
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

function toggleSection(id) {
  $(id).classList.toggle('collapsed');
}

function toggleOutput() {
  $('outputSection').classList.toggle('collapsed');
}

const PANELS = { rich: 'richPanel', faq: 'faqPanel', photo: 'photoPanel', gradient: 'gradientPanel' };
let currentTab = 'rich';

function switchTab(name) {
  if (!PANELS[name]) name = 'rich';
  currentTab = name;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  Object.keys(PANELS).forEach(k => { $(PANELS[k]).style.display = k === name ? '' : 'none'; });
  localStorage.setItem('activeTab', name);
}

function activeTab() {
  return currentTab;
}

function cc(el, hintId, max) {
  const v = el.value.length;
  const h = $(hintId);
  h.textContent = v + ' симв.';
  h.className = 'char-count' + (v > max ? ' err' : v > max * 0.9 ? ' warn' : '');
}

function buildImgCols() {
  const c = $('imgCols');
  c.innerHTML = '';
  for (let i = 1; i <= 3; i++) {
    const d = document.createElement('div');
    d.className = 'img-card';

    const defAlt = ['First photo', 'Second photo', 'Third photo'][i - 1];
    d.innerHTML = `
      <div class="img-card-title">Зображення ${i}</div>
      <div class="field">
        <label>Alt-текст <span class="req">*</span></label>
        <input type="text" id="i${i}alt" value="${defAlt}" placeholder="SEO-текст для фото ${i}">
      </div>
      <div class="field">
        <label>Режим тексту <span class="hint">ліміти символів</span></label>
        <div class="seg" id="i${i}seg">
          <button type="button" class="seg-btn active" onclick="setMode(${i},'one',this)">1 рядок</button>
          <button type="button" class="seg-btn" onclick="setMode(${i},'two',this)">2 рядки</button>
          <button type="button" class="seg-btn" onclick="setMode(${i},'custom',this)">Кастом</button>
        </div>
      </div>
      <div class="field">
        <div class="field-row">
          <label>Заголовок <span class="hint" id="i${i}sh">до 25 симв.</span></label>
          <span class="char-count" id="i${i}sc">0/25</span>
        </div>
        <input type="text" id="i${i}span" placeholder="Весна / Літо / Осінь" oninput="chkSpan(${i},this)">
      </div>
      <div class="field">
        <div class="field-row">
          <label>Підпис <span class="hint" id="i${i}ph">до 126 симв.</span></label>
          <span class="char-count" id="i${i}pc">0/126</span>
        </div>
        <textarea id="i${i}p" rows="2" placeholder="Короткий підпис" oninput="chkP(${i},this)"></textarea>
      </div>`;
    c.appendChild(d);
  }
}

const LINE_MODES = {
  one: { span: 25, p: 126 },
  two: { span: 50, p: 80 },
  custom: { span: null, p: null }
};
const cellMode = { 1: 'one', 2: 'one', 3: 'one' };

function setMode(i, mode, btn) {
  cellMode[i] = mode;
  document.querySelectorAll(`#i${i}seg .seg-btn`).forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const m = LINE_MODES[mode];
  $(`i${i}sh`).textContent = m.span ? `до ${m.span} симв.` : 'без ліміту';
  $(`i${i}ph`).textContent = m.p ? `до ${m.p} симв.` : 'без ліміту';
  chkSpan(i, $(`i${i}span`));
  chkP(i, $(`i${i}p`));
}

function chkSpan(i, el) {
  const v = el.value.length;
  const h = $(`i${i}sc`);
  const max = LINE_MODES[cellMode[i]].span;
  if (max === null) {
    h.textContent = v + ' симв.';
    h.className = 'char-count';
    return;
  }
  h.textContent = v + '/' + max;
  h.className = 'char-count' + (v > max ? ' err' : v > max * 0.85 ? ' warn' : '');
}

function chkP(i, el) {
  const v = el.value.length;
  const h = $(`i${i}pc`);
  const max = LINE_MODES[cellMode[i]].p;
  if (max === null) {
    h.textContent = v + ' симв.';
    h.className = 'char-count';
    return;
  }
  h.textContent = v + '/' + max;
  h.className = 'char-count' + (v > max ? ' err' : v > max * 0.85 ? ' warn' : '');
}

function generate() {
  const isGradient = $('gradientToggle').checked;
  const sharedFolder = g('sharedFolder').trim();
  const sharedName = g('sharedName').trim();
  const posSuffixes = ['_left', '_middle', '_right'];
  let s1 = '<div class="rich-content-three-images">\n';
  for (let i = 1; i <= 3; i++) {
    const suffix = posSuffixes[i - 1] + (isGradient ? '_gradient' : '');
    const imgUrl = (sharedFolder && sharedName)
      ? `https://www.gorgany.com/media/wysiwyg/all_rich/eight_pack/${sharedFolder}/${sharedName}${suffix}.jpg?format=webp`
      : '';
    s1 += `    <div class="col">\n`;
    s1 += `        <img src="${imgUrl}" alt="${esc(g(`i${i}alt`))}">\n`;
    s1 += `        <div>\n`;
    s1 += `            <span>${esc(g(`i${i}span`))}</span>\n`;
    s1 += `            <p>${esc(g(`i${i}p`))}</p>\n`;
    s1 += `        </div>\n`;
    s1 += `    </div>\n`;
  }
  s1 += '</div>';

  const s2imgUrl = (sharedFolder && sharedName)
    ? `https://www.gorgany.com/media/wysiwyg/all_rich/eight_pack/${sharedFolder}/${sharedName}_long.jpg?format=webp`
    : '';
  const s2 =
    `<div class="rich-content-one-image">\n` +
    `    <div>\n` +
    `        <img src="${s2imgUrl}" alt="${esc(g('s2alt'))}">\n` +
    `    </div>\n` +
    `</div>`;

  const h3 = esc(g('s3h3'));
  const short = esc(g('s3short'));
  const long = esc(g('s3long'));
  const tvT = esc(g('tv_title'));
  const tv1n = esc(g('tv1n')), tv1v = esc(g('tv1v'));
  const tv2n = esc(g('tv2n')), tv2v = esc(g('tv2v'));
  const tv3n = esc(g('tv3n')), tv3v = esc(g('tv3v'));
  const purT = esc(g('purposeTitle')), purTx = esc(g('purposeText'));
  const feaT = esc(g('featTitle'));
  const feaTxLines = g('featText').split('\n').filter(l => l.trim()).map(l => `                    <p>${esc(l.trim())}</p>`).join('\n');
  const tecT = esc(g('techTitle')), tecTx = esc(g('techText'));
  const tecP = tecTx ? `\n                    <p>${tecTx}</p>` : '';
  const madeInUkraine = $('madeInUkraineToggle').checked
    ? `\n        <div class="made-in-ukraine">\n            <span>Зроблено з любов'ю в Україні</span>\n        </div>`
    : '';
  const threeValuesBlock = $('threeValuesToggle').checked
    ? `
        <div class="three-values">
            <h3>${tvT}</h3>
            <div class="values-wrappep">
                <div>
                    <p>${tv1n}</p>
                    <span>${tv1v}</span>
                </div>
                <div>
                    <p>${tv2n}</p>
                    <span>${tv2v}</span>
                </div>
                <div>
                    <p>${tv3n}</p>
                    <span>${tv3v}</span>
                </div>
            </div>
        </div>`
    : '';

  const s3 =
    `<div class="rich-content-description-characteristics">
    <div class="col-left">
        <div class="collapsible description">
            <h3>${h3}</h3>
            <p class="short-content">${short}<a class="more-link" data-role="title" href="javascript:void(0)">Читати більше</a></p>
            <p class="long-content" data-role="content">${long}<a class="less-link" data-role="title" href="javascript:void(0)">Читати менше</a></p>
        </div>
        ${threeValuesBlock}
    </div>
    <div class="col-right">
        <div class="characteristics">
            <div class="collapsible purpose">
                <div class="title action toggle" data-role="title">
                    <span>${purT}</span>
                </div>
                <div class="content" data-role="content">
                    <p>${purTx}</p>
                </div>
            </div>
            <div class="collapsible features">
                <div class="title action toggle" data-role="title">
                    <span>${feaT}</span>
                </div>
                <div class="content" data-role="content">
${feaTxLines}
                </div>
            </div>
            <div class="collapsible technical-characteristics">
                <div class="title action toggle" data-role="title">
                    <span>${tecT}</span>
                </div>
                <div class="content" data-role="content">${tecP}
                </div>
            </div>
        </div>${madeInUkraine}
    </div>
</div>`;

  const html = s1 + '\n' + s2 + '\n' + s3;
  const el = $('output');
  el.textContent = html;
  el.classList.remove('output-empty');
  el.closest('.output-section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  saveGeneration(g('s3h3'), html);
}

function doCopy() {
  const txt = $('output').textContent;
  if (!txt || txt.startsWith('Заповни')) return;
  navigator.clipboard.writeText(txt).then(() => {
    flashBtn($('copybtn'));
    $('statusMsg').textContent = 'Готово до вставки в CMS';
    setTimeout(() => { $('statusMsg').textContent = ''; }, 2500);
  });
}

function saveGeneration(name, html) {
  const history = JSON.parse(localStorage.getItem('richHistory') || '[]');
  history.unshift({
    name: name || `Генерація ${new Date().toLocaleTimeString('uk', { hour: '2-digit', minute: '2-digit' })}`,
    html,
    time: new Date().toLocaleTimeString('uk', { hour: '2-digit', minute: '2-digit' })
  });
  if (history.length > 5) history.length = 5;
  localStorage.setItem('richHistory', JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem('richHistory') || '[]');
  const section = $('historySection');
  const list = $('historyList');
  if (!history.length) { section.style.display = 'none'; return; }
  section.style.display = '';
  list.innerHTML = history.map((e, i) => `
    <div class="history-item">
      <div class="history-item-info" onclick="loadHistoryItem(${i})" title="Завантажити у вивід">
        <span class="history-item-name">${esc(e.name)}</span>
        <span class="history-item-time">${e.time}</span>
      </div>
      <button class="copy-btn" id="hcopy${i}" onclick="copyHistoryItem(${i})">Копіювати</button>
    </div>
  `).join('');
}

function loadHistoryItem(i) {
  const history = JSON.parse(localStorage.getItem('richHistory') || '[]');
  if (!history[i]) return;
  const el = $('output');
  el.textContent = history[i].html;
  el.classList.remove('output-empty');
  el.closest('.output-section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function copyHistoryItem(i) {
  const history = JSON.parse(localStorage.getItem('richHistory') || '[]');
  if (!history[i]) return;
  navigator.clipboard.writeText(history[i].html).then(() => flashBtn($(`hcopy${i}`)));
}

function clearHistory() {
  localStorage.removeItem('richHistory');
  renderHistory();
}

buildImgCols();
renderHistory();
switchTab(localStorage.getItem('activeTab') || 'rich');
