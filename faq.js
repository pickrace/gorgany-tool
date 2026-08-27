const FAQ_TRANSLIT = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e',
  'є': 'ie', 'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'i', 'й': 'i',
  'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
  'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch',
  'ш': 'sh', 'щ': 'shch', 'ь': '', 'ю': 'iu', 'я': 'ia',
  "'": '', 'ʼ': '', '’': '', 'ы': 'y', 'э': 'e', 'ё': 'e', 'ъ': ''
};

function faqSlugify(raw) {
  let out = '';
  for (const ch of (raw || '').toLowerCase().trim()) {
    out += FAQ_TRANSLIT[ch] !== undefined ? FAQ_TRANSLIT[ch] : ch;
  }
  return out
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const faqEscHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const faqParagraphs = a => a.split(/\n+/).map(s => s.trim()).filter(Boolean);

function buildFaqHtml(items) {
  const L = ['<section class="faq">', '  <h2>Питання та відповіді</h2>'];
  items.forEach((it, i) => {
    const n = i + 1;
    L.push(`  <!-- ПОЧАТОК ПИТАННЯ №${n} -->`);
    L.push('  <div class="faq-item collapsible">');
    L.push(`    <h3 class="title action" data-role="title">${faqEscHtml(it.q.trim())}</h3>`);
    L.push('    <div class="content" data-role="content">');
    faqParagraphs(it.a).forEach(p => L.push(`      <p>${faqEscHtml(p)}</p>`));
    L.push('    </div>');
    L.push('  </div>');
    L.push(`  <!-- КІНЕЦЬ ПИТАННЯ №${n} -->`);
  });
  L.push('</section>');
  L.push('{{block class="Magento\\\\Framework\\\\View\\\\Element\\\\Template" template="DecimaDigital_SeoBooster::faq-js.phtml"}}');
  return L.join('\n');
}

function buildFaqJson(items) {
  const obj = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': items.map(it => ({
      '@type': 'Question',
      'name': it.q.trim(),
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': faqParagraphs(it.a).join(' ')
      }
    }))
  };
  return '<script type="application/ld+json">\n' + JSON.stringify(obj, null, 2) + '\n</' + 'script>';
}

function pluralPyt(n) {
  const m10 = n % 10, m100 = n % 100;
  return (m10 >= 1 && m10 <= 4 && !(m100 >= 11 && m100 <= 14)) ? 'питання' : 'питань';
}

let faqItems = [{ q: '', a: '' }, { q: '', a: '' }];

function faqFilled() {
  return faqItems.filter(it => it.q.trim() && it.a.trim());
}

function faqRender() {
  const list = $('faqList');
  list.innerHTML = faqItems.map((it, i) => `
    <div class="qa-card">
      <div class="qa-card-head">
        <span class="qa-num">Питання ${i + 1}</span>
        <div class="qa-tools">
          <button class="icon-btn" title="Вгору" onclick="faqMove(${i},-1)" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button class="icon-btn" title="Вниз" onclick="faqMove(${i},1)" ${i === faqItems.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="icon-btn danger" title="Видалити" onclick="faqRemove(${i})">✕</button>
        </div>
      </div>
      <div class="field">
        <input type="text" value="${esc(it.q)}" placeholder="Питання" oninput="faqItems[${i}].q = this.value; faqSoftUpdate()">
      </div>
      <div class="field">
        <textarea rows="3" placeholder="Відповідь. Новий рядок — окремий абзац." oninput="faqItems[${i}].a = this.value; faqSoftUpdate()">${esc(it.a)}</textarea>
      </div>
      <div class="qa-warn" id="faqWarn${i}" style="display:none">Заповни і питання, і відповідь — інакше пара не потрапить у код.</div>
    </div>
  `).join('');
  faqSoftUpdate();
}

function faqSoftUpdate() {
  const n = faqFilled().length;
  $('faqCountDesc').textContent = `${n} ${pluralPyt(n)} у коді`;
  faqItems.forEach((it, i) => {
    const w = $(`faqWarn${i}`);
    if (!w) return;
    const half = (it.q.trim() ? 1 : 0) + (it.a.trim() ? 1 : 0) === 1;
    w.style.display = half ? '' : 'none';
  });
}

function faqAdd() {
  faqItems.push({ q: '', a: '' });
  faqRender();
}

function faqRemove(i) {
  faqItems.splice(i, 1);
  if (!faqItems.length) faqItems.push({ q: '', a: '' });
  faqRender();
}

function faqMove(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= faqItems.length) return;
  [faqItems[i], faqItems[j]] = [faqItems[j], faqItems[i]];
  faqRender();
}

function toggleFaqImport() {
  const p = $('faqImportPanel');
  p.style.display = p.style.display === 'none' ? '' : 'none';
}

function faqImport(mode) {
  const text = $('faqImportText').value;
  const parsed = text
    .split(/\n\s*\n+/)
    .map(b => b.trim())
    .filter(Boolean)
    .map(b => {
      const ls = b.split('\n').map(s => s.trim()).filter(Boolean);
      const q = (ls[0] || '').replace(/^(\d+[\.\)]\s*|[QqПп]:\s*)/, '');
      const a = ls.slice(1).map(s => s.replace(/^[AaВв]:\s*/, '')).join('\n');
      return { q, a };
    })
    .filter(x => x.q);
  if (!parsed.length) return;
  faqItems = mode === 'replace'
    ? parsed
    : [...faqItems.filter(it => it.q.trim() || it.a.trim()), ...parsed];
  $('faqImportText').value = '';
  toggleFaqImport();
  faqRender();
}

function faqNameInput() {
  const slug = faqSlugify(g('faqName'));
  const idH = slug ? slug + '-faq-html' : '…-faq-html';
  const idJ = slug ? slug + '-faq-json' : '…-faq-json';
  $('faqIdHtml').textContent = idH;
  $('faqIdJson').textContent = idJ;
  $('faqOutIdHtml').textContent = idH;
  $('faqOutIdJson').textContent = idJ;
}

function copyFaqId(kind) {
  const slug = faqSlugify(g('faqName'));
  if (!slug) return;
  const btn = $(kind === 'html' ? 'faqIdHtmlBtn' : 'faqIdJsonBtn');
  navigator.clipboard.writeText(`${slug}-faq-${kind}`).then(() => flashBtn(btn));
}

function toggleFaqOutput() {
  $('faqOutputSection').classList.toggle('collapsed');
}

function faqGenerate() {
  const filled = faqFilled();
  const status = $('faqStatusMsg');
  if (!filled.length) {
    status.textContent = 'Додай хоча б одну повну пару «питання + відповідь»';
    setTimeout(() => { status.textContent = ''; }, 3000);
    return;
  }
  const slug = faqSlugify(g('faqName'));
  const html = buildFaqHtml(filled);
  const json = buildFaqJson(filled);
  setFaqOutputs(html, json);
  status.textContent = !slug
    ? 'Не забудь назву сторінки — вона дає identifier блоків'
    : filled.length === 1
      ? 'Для FAQ-розмітки краще щонайменше 2 питання'
      : 'Готово до вставки в CMS';
  setTimeout(() => { status.textContent = ''; }, 4000);
  saveFaqGeneration(g('faqName').trim() || 'FAQ без назви', slug, html, json);
}

function setFaqOutputs(html, json) {
  const oH = $('faqOutputHtml');
  const oJ = $('faqOutputJson');
  oH.textContent = html;
  oH.classList.remove('output-empty');
  oJ.textContent = json;
  oJ.classList.remove('output-empty');
  const section = $('faqOutputSection');
  section.classList.remove('collapsed');
  section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function copyFaqCode(kind) {
  const el = $(kind === 'html' ? 'faqOutputHtml' : 'faqOutputJson');
  const btn = $(kind === 'html' ? 'faqCopyHtmlBtn' : 'faqCopyJsonBtn');
  if (el.classList.contains('output-empty')) return;
  navigator.clipboard.writeText(el.textContent).then(() => flashBtn(btn, '✓'));
}

function saveFaqGeneration(name, slug, html, json) {
  const history = JSON.parse(localStorage.getItem('faqHistory') || '[]');
  history.unshift({
    name,
    slug,
    html,
    json,
    time: new Date().toLocaleTimeString('uk', { hour: '2-digit', minute: '2-digit' })
  });
  if (history.length > 5) history.length = 5;
  localStorage.setItem('faqHistory', JSON.stringify(history));
  renderFaqHistory();
}

function renderFaqHistory() {
  const history = JSON.parse(localStorage.getItem('faqHistory') || '[]');
  const section = $('faqHistorySection');
  const list = $('faqHistoryList');
  if (!history.length) { section.style.display = 'none'; return; }
  section.style.display = '';
  list.innerHTML = history.map((e, i) => `
    <div class="history-item">
      <div class="history-item-info" onclick="loadFaqHistoryItem(${i})" title="Завантажити у вивід">
        <span class="history-item-name">${esc(e.name)}</span>
        <span class="history-item-time">${e.time}</span>
      </div>
      <button class="copy-btn copy-btn-sm" id="faqHCopyH${i}" onclick="copyFaqHistoryItem(${i},'html')">HTML</button>
      <button class="copy-btn copy-btn-sm" id="faqHCopyJ${i}" onclick="copyFaqHistoryItem(${i},'json')">JSON</button>
    </div>
  `).join('');
}

function loadFaqHistoryItem(i) {
  const history = JSON.parse(localStorage.getItem('faqHistory') || '[]');
  if (!history[i]) return;
  const e = history[i];
  if (e.slug) {
    $('faqOutIdHtml').textContent = e.slug + '-faq-html';
    $('faqOutIdJson').textContent = e.slug + '-faq-json';
  }
  setFaqOutputs(e.html, e.json);
}

function copyFaqHistoryItem(i, kind) {
  const history = JSON.parse(localStorage.getItem('faqHistory') || '[]');
  if (!history[i]) return;
  const btn = $((kind === 'html' ? 'faqHCopyH' : 'faqHCopyJ') + i);
  navigator.clipboard.writeText(history[i][kind]).then(() => flashBtn(btn, '✓'));
}

function clearFaqHistory() {
  localStorage.removeItem('faqHistory');
  renderFaqHistory();
}

faqRender();
renderFaqHistory();
faqNameInput();
