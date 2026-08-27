(function () {
  "use strict";

  const state = {
    file: null,
    products: [],
    idx: 0,
    batch: null,
    cfg: {
      sq: 800, bw: 1600, bh: 800, suffixes: ["left", "middle", "right", "long"], quality: 0.92,
      gradOn: true, gradStart: 75, gradOpacity: 80, gradColor: "#000000"
    }
  };

  const IMG_RE = /\.(jpe?g|png|webp|bmp|gif|jfif|avif)$/i;
  const SQ_COLOR = "#C5222A";
  const BN_COLOR = "#b8620a";
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const clamp01 = v => clamp(v, 0, 1);

  const TRANSLIT = { "а": "a", "б": "b", "в": "v", "г": "h", "ґ": "g", "д": "d", "е": "e", "є": "ie", "ж": "zh", "з": "z", "и": "y", "і": "i", "ї": "i", "й": "i", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f", "х": "kh", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "shch", "ь": "", "ю": "iu", "я": "ia", "ы": "y", "э": "e", "ё": "e", "ъ": "", "'": "", "’": "" };

  function translit(s) {
    return s.toLowerCase().split("").map(c => TRANSLIT[c] !== undefined ? TRANSLIT[c] : c).join("");
  }

  function tidy(s) {
    return s.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_-]+/g, "").replace(/_+/g, "_").replace(/^[_-]+|[_-]+$/g, "");
  }

  function slugify(name) {
    const latin = name.split(/\s+/).filter(t => t && !/[\u0400-\u04FF]/.test(t)).join("_");
    return tidy(latin) || tidy(translit(name));
  }

  function intVal(id, def) {
    const v = parseInt($(id).value, 10);
    return Number.isFinite(v) && v > 0 ? v : def;
  }

  function arOf(role) { return role === "banner" ? state.cfg.bw / state.cfg.bh : 1; }
  function targetOf(role) { return role === "banner" ? { w: state.cfg.bw, h: state.cfg.bh } : { w: state.cfg.sq, h: state.cfg.sq }; }

  function cropRect(im, role) {
    const ar = arOf(role), W = im.w, H = im.h;
    let sw, sh;
    if (W / H >= ar) { sh = H; sw = H * ar; } else { sw = W; sh = W / ar; }
    const cx = im.cx * W, cy = im.cy * H;
    const sx = clamp(cx - sw / 2, 0, W - sw);
    const sy = clamp(cy - sh / 2, 0, H - sh);
    return { sx, sy, sw, sh };
  }

  function hexToRgb(hex) {
    hex = (hex || "#000000").replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
    return { r: parseInt(hex.slice(0, 2), 16) || 0, g: parseInt(hex.slice(2, 4), 16) || 0, b: parseInt(hex.slice(4, 6), 16) || 0 };
  }

  function paintGradient(ctx, w, h) {
    const sY = h * (state.cfg.gradStart / 100);
    const op = state.cfg.gradOpacity / 100;
    const { r, g, b } = hexToRgb(state.cfg.gradColor);
    const lg = ctx.createLinearGradient(0, sY, 0, h);
    lg.addColorStop(0, "rgba(" + r + "," + g + "," + b + ",0)");
    lg.addColorStop(1, "rgba(" + r + "," + g + "," + b + "," + op + ")");
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, w, h);
  }

  function fileNames(p) {
    const used = {}; const out = []; let extra = 0;
    const S = state.cfg.suffixes;
    for (const im of p.images) {
      const n = /^\d+$/.test(im.stem) ? parseInt(im.stem, 10) : null;
      let suf;
      if (n !== null && S[n - 1]) suf = S[n - 1];
      else if (im.role === "banner") suf = S[3] || "long";
      else { extra++; suf = "p" + (n !== null ? n : extra); }
      const base = p.slug + "_" + suf;
      let name = base + ".jpg", k = 2;
      while (used[name]) { name = base + "_" + k + ".jpg"; k++; }
      used[name] = 1;
      out.push(name);
    }
    return out;
  }

  function stemOf(name) { return name.replace(/\.[^.]+$/, "").trim(); }

  function pad(n) { return String(n).padStart(2, "0"); }

  function newBatch() {
    const d = new Date();
    const date = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    const time = pad(d.getHours()) + ":" + pad(d.getMinutes());
    const id = date + "_" + pad(d.getHours()) + "-" + pad(d.getMinutes()) + "-" + pad(d.getSeconds());
    return { id, date, time };
  }

  function batchPayload() {
    const b = state.batch || newBatch();
    return {
      id: b.id,
      date: b.date,
      time: b.time,
      total: state.products.length,
      items: state.products.map(p => ({
        name: p.name,
        slug: p.slug,
        status: p.status,
        photos: p.images.length
      }))
    };
  }

  async function loadDrawable(blob) {
    if (typeof createImageBitmap === "function") {
      try { const bm = await createImageBitmap(blob); return { src: bm, w: bm.width, h: bm.height }; }
      catch (e) { /* fallback */ }
    }
    return await new Promise((res, rej) => {
      const url = URL.createObjectURL(blob);
      const im = new Image();
      im.onload = () => res({ src: im, w: im.naturalWidth, h: im.naturalHeight });
      im.onerror = () => { URL.revokeObjectURL(url); rej(new Error("decode")); };
      im.src = url;
    });
  }

  function autoRoles(images) {
    let bi = -1;
    images.forEach((im, i) => { if (/^\d+$/.test(im.stem) && parseInt(im.stem, 10) === 4) bi = i; });
    if (bi === -1) {
      let best = -1;
      images.forEach((im, i) => { const a = im.w / im.h; if (a > best) { best = a; bi = i; } });
    }
    images.forEach((im, i) => im.role = (i === bi ? "banner" : "square"));
  }

  function warnFor(images) {
    const b = images.filter(im => im.role === "banner").length;
    if (images.length !== 4) return "Фото в папці: " + images.length + " (очікується 4)";
    if (b !== 1) return "Банерів: " + b + " (очікується 1)";
    return null;
  }

  async function parseZip(file) {
    const zip = await JSZip.loadAsync(file);
    const groups = {};
    zip.forEach((path, zobj) => {
      if (zobj.dir) return;
      if (path.includes("__MACOSX/")) return;
      const base = path.split("/").pop();
      if (!base || base.startsWith(".") || base.startsWith("._")) return;
      if (!IMG_RE.test(base)) return;
      const parts = path.split("/").filter(Boolean);
      const parent = parts.length >= 2 ? parts[parts.length - 2] : "(корінь)";
      (groups[parent] = groups[parent] || []).push({ name: base, zobj });
    });

    let found = 0, opened = 0;
    const products = [];
    const dirs = Object.keys(groups).sort((a, b) => a.localeCompare(b, "uk", { numeric: true }));
    for (const dn of dirs) {
      const files = groups[dn];
      found += files.length;
      const imgs = [];
      for (const f of files) {
        try {
          const blob = await f.zobj.async("blob");
          const d = await loadDrawable(blob);
          imgs.push({ name: f.name, stem: stemOf(f.name), img: d.src, w: d.w, h: d.h, role: "square", cx: 0.5, cy: 0.5 });
          opened++;
        } catch (e) { /* пропуск */ }
      }
      if (!imgs.length) continue;
      const numeric = imgs.filter(im => /^\d+$/.test(im.stem));
      const chosen = numeric.length ? numeric : imgs;
      chosen.sort((a, b) => numeric.length
        ? (parseInt(a.stem, 10) - parseInt(b.stem, 10))
        : a.name.localeCompare(b.name, "uk", { numeric: true }));
      autoRoles(chosen);
      products.push({ name: dn, slug: slugify(dn), images: chosen, status: "pending", warn: warnFor(chosen) });
    }
    return { products, found, opened };
  }

  function drawSource(canvas, im, role) {
    const maxW = 300;
    const scale = Math.min(1, maxW / im.w);
    const dw = Math.max(1, Math.round(im.w * scale)), dh = Math.max(1, Math.round(im.h * scale));
    canvas.width = dw; canvas.height = dh;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, dw, dh);
    ctx.drawImage(im.img, 0, 0, dw, dh);
    ctx.fillStyle = "rgba(26,25,23,0.58)";
    ctx.fillRect(0, 0, dw, dh);
    const r = cropRect(im, role);
    const rx = r.sx * scale, ry = r.sy * scale, rw = r.sw * scale, rh = r.sh * scale;
    ctx.drawImage(im.img, r.sx, r.sy, r.sw, r.sh, rx, ry, rw, rh);
    if (role === "square" && state.cfg.gradOn) {
      const sY = ry + rh * (state.cfg.gradStart / 100);
      const op = state.cfg.gradOpacity / 100;
      const { r: cr, g: cg, b: cb } = hexToRgb(state.cfg.gradColor);
      const lg = ctx.createLinearGradient(0, sY, 0, ry + rh);
      lg.addColorStop(0, "rgba(" + cr + "," + cg + "," + cb + ",0)");
      lg.addColorStop(1, "rgba(" + cr + "," + cg + "," + cb + "," + op + ")");
      ctx.fillStyle = lg;
      ctx.fillRect(rx, ry, rw, rh);
    }
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255,255,255,.95)";
    ctx.strokeRect(rx + 1.5, ry + 1.5, rw - 3, rh - 3);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = role === "banner" ? BN_COLOR : SQ_COLOR;
    ctx.strokeRect(rx + 1.5, ry + 1.5, rw - 3, rh - 3);
  }

  function show(name) {
    ["Upload", "Review", "Summary"].forEach(s => {
      $("pScreen" + s).style.display = (s.toLowerCase() === name) ? "" : "none";
    });
    $("pRestartTop").hidden = (name === "upload");
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function renderReview() {
    const p = state.products[state.idx];
    $("pName").textContent = p.name;
    $("pSlug").textContent = p.slug;
    $("pProg").textContent = "Товар " + (state.idx + 1) + " з " + state.products.length;

    const st = $("pStatus");
    if (p.status === "approved") { st.hidden = false; st.className = "statuspill s-ok"; st.textContent = "Погоджено"; }
    else if (p.status === "rejected") { st.hidden = false; st.className = "statuspill s-no"; st.textContent = "Відхилено"; }
    else st.hidden = true;

    const w = $("pWarn");
    if (p.warn) { w.hidden = false; w.textContent = "⚠ " + p.warn; } else w.hidden = true;

    const grid = $("pGrid");
    grid.innerHTML = "";
    const names = fileNames(p);
    p.images.forEach((im, i) => {
      const card = document.createElement("div");
      card.className = "p-card";
      const cv = document.createElement("canvas");
      const meta = document.createElement("div");
      meta.className = "p-meta";
      const t = targetOf(im.role);
      const pill = document.createElement("span");
      pill.className = "pill " + (im.role === "banner" ? "pill-bn" : "pill-sq");
      pill.textContent = (im.role === "banner" ? "Банер" : "Квадрат") + " " + t.w + "×" + t.h;
      const fn = document.createElement("div");
      fn.className = "p-fn";
      fn.textContent = names[i];
      const tog = document.createElement("button");
      tog.className = "link-btn";
      tog.textContent = im.role === "banner" ? "Зробити квадратом" : "Зробити банером";
      tog.onclick = () => {
        im.role = im.role === "banner" ? "square" : "banner";
        p.warn = warnFor(p.images);
        renderReview();
      };
      meta.append(pill, fn, tog);
      card.append(cv, meta);
      grid.appendChild(card);
      drawSource(cv, im, im.role);
      cv.addEventListener("click", e => {
        const rc = cv.getBoundingClientRect();
        im.cx = clamp01((e.clientX - rc.left) / rc.width);
        im.cy = clamp01((e.clientY - rc.top) / rc.height);
        drawSource(cv, im, im.role);
      });
    });
  }

  function gotoNextPending() {
    const n = state.products.length;
    for (let k = 1; k <= n; k++) {
      const j = (state.idx + k) % n;
      if (state.products[j].status === "pending") { state.idx = j; renderReview(); return; }
    }
    showSummary();
  }

  function decide(s) {
    state.products[state.idx].status = s;
    gotoNextPending();
  }

  function showSummary() {
    const a = state.products.filter(p => p.status === "approved");
    const r = state.products.filter(p => p.status === "rejected");
    const pend = state.products.filter(p => p.status === "pending");
    $("pStOk").textContent = a.length;
    $("pStNo").textContent = r.length;
    $("pStPend").textContent = pend.length;

    const note = $("pPendNote");
    if (pend.length) {
      note.hidden = false;
      note.textContent = "Без рішення: " + pend.length + ". Ці товари не потраплять в архів. Повернись до перегляду, щоб вирішити.";
    } else note.hidden = true;

    $("pDownload").disabled = a.length === 0;
    $("pDownload").textContent = "⤓ Завантажити архів" + (a.length ? (" (" + a.length + ")") : "");

    const block = $("pRejBlock"), allok = $("pAllOk");
    if (r.length) {
      block.hidden = false;
      allok.hidden = true;
      $("pRejCount").textContent = r.length;
      $("pRejList").value = r.map(p => p.name).join("\n");
    } else {
      block.hidden = true;
      allok.hidden = (a.length === 0);
    }
    show("summary");
  }

  async function buildZip() {
    const approved = state.products.filter(p => p.status === "approved");
    if (!approved.length) return;
    const btn = $("pDownload");
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Готую архів…";
    try {
      const zip = new JSZip();
      for (const p of approved) {
        const folder = zip.folder(p.name);
        const names = fileNames(p);
        for (let i = 0; i < p.images.length; i++) {
          const im = p.images[i], t = targetOf(im.role);
          const c = document.createElement("canvas");
          c.width = t.w; c.height = t.h;
          const ctx = c.getContext("2d");
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          const r = cropRect(im, im.role);
          ctx.drawImage(im.img, r.sx, r.sy, r.sw, r.sh, 0, 0, t.w, t.h);
          if (im.role === "square" && state.cfg.gradOn) paintGradient(ctx, t.w, t.h);
          const blob = await new Promise(res => c.toBlob(res, "image/jpeg", state.cfg.quality));
          folder.file(names[i], blob);
        }
      }
      const out = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
        m => { btn.textContent = "Готую архів… " + Math.round(m.percent) + "%"; });
      download(out, "rich-content.zip");
      btn.textContent = label;
      if (typeof pushBatchLog === "function") pushBatchLog(batchPayload());
    } catch (e) {
      btn.textContent = "Помилка — спробуй ще раз";
      console.error(e);
    } finally {
      btn.disabled = false;
    }
  }

  function setFile(f) {
    if (!f) return;
    if (!/\.zip$/i.test(f.name) && !/zip/i.test(f.type)) {
      $("pMsg").textContent = "Потрібен файл .zip";
      $("pMsg").className = "msg err";
      return;
    }
    state.file = f;
    $("pFileName").textContent = f.name;
    $("pMsg").textContent = "";
    $("pMsg").className = "msg";
    $("pProcess").disabled = false;
  }

  $("pFile").addEventListener("change", e => setFile(e.target.files[0]));

  const drop = $("pDrop");
  ["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", e => { const f = e.dataTransfer.files[0]; if (f) setFile(f); });

  $("pProcess").addEventListener("click", async () => {
    if (!state.file) return;
    state.cfg.sq = intVal("pCfgSq", 800);
    state.cfg.bw = intVal("pCfgBw", 1600);
    state.cfg.bh = intVal("pCfgBh", 800);
    state.cfg.quality = clamp(intVal("pCfgQ", 92), 1, 100) / 100;
    const sfx = $("pCfgSuffixes").value.split(",").map(s => s.trim()).filter(Boolean);
    state.cfg.suffixes = sfx.length ? sfx : ["left", "middle", "right", "long"];
    state.cfg.gradOn = $("pGradOn").checked;
    state.cfg.gradStart = clamp(intVal("pGradStart", 75), 0, 100);
    state.cfg.gradOpacity = clamp(intVal("pGradOp", 80), 0, 100);
    state.cfg.gradColor = $("pGradColor").value || "#000000";

    const btn = $("pProcess");
    btn.disabled = true;
    btn.textContent = "Обробляю…";
    $("pMsg").textContent = "";
    $("pMsg").className = "msg";
    try {
      const { products, found, opened } = await parseZip(state.file);
      if (!products.length) {
        $("pMsg").textContent = (found > 0 && opened === 0)
          ? "Знайдено " + found + " фото, але браузер не зміг їх відкрити. Завантаж проєкт і відкрий index.html локально."
          : "У ZIP не знайдено папок із фото.";
        $("pMsg").className = "msg err";
        btn.disabled = false;
        btn.textContent = "Обробити";
        return;
      }
      state.products = products;
      state.idx = 0;
      state.batch = newBatch();
      show("review");
      renderReview();
    } catch (e) {
      $("pMsg").textContent = "Не вдалося прочитати ZIP.";
      $("pMsg").className = "msg err";
      console.error(e);
    } finally {
      btn.disabled = false;
      btn.textContent = "Обробити";
    }
  });

  $("pPrev").addEventListener("click", () => { const n = state.products.length; state.idx = (state.idx - 1 + n) % n; renderReview(); });
  $("pNext").addEventListener("click", () => { const n = state.products.length; state.idx = (state.idx + 1) % n; renderReview(); });
  $("pApprove").addEventListener("click", () => decide("approved"));
  $("pReject").addEventListener("click", () => decide("rejected"));
  $("pToSummary").addEventListener("click", showSummary);
  $("pBackReview").addEventListener("click", () => { show("review"); renderReview(); });
  $("pDownload").addEventListener("click", buildZip);

  $("pCopyRej").addEventListener("click", async () => {
    const txt = $("pRejList").value;
    try { await navigator.clipboard.writeText(txt); }
    catch (e) { $("pRejList").select(); document.execCommand("copy"); }
    $("pCopyMsg").textContent = "Скопійовано";
    setTimeout(() => $("pCopyMsg").textContent = "", 1800);
  });

  $("pDlRej").addEventListener("click", () => {
    download(new Blob([$("pRejList").value], { type: "text/plain" }), "непогоджені.txt");
  });

  function restart() {
    state.file = null;
    state.products = [];
    state.idx = 0;
    state.batch = null;
    $("pFile").value = "";
    $("pLogMsg").textContent = "";
    $("pFileName").textContent = "";
    $("pProcess").disabled = true;
    $("pMsg").textContent = "";
    show("upload");
  }

  $("pRestart").addEventListener("click", restart);
  $("pRestartTop").addEventListener("click", restart);

  document.addEventListener("keydown", e => {
    if (activeTab() !== "photo") return;
    if ($("pScreenReview").style.display === "none") return;
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea") return;
    if (e.key === "ArrowRight") $("pNext").click();
    else if (e.key === "ArrowLeft") $("pPrev").click();
    else if (e.key === "a" || e.key === "A") decide("approved");
    else if (e.key === "r" || e.key === "R") decide("rejected");
  });
})();