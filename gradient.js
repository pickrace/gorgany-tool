(function () {
  "use strict";

  const drop = $('gDrop');
  const fileInput = $('gFile');
  const canvas = $('gCanvas');
  const ctx = canvas.getContext('2d');
  const thumbsEl = $('gThumbs');
  const btnDownload = $('gDownload');
  const btnAll = $('gAll');
  const fileCount = $('gCount');
  const gradStart = $('gStart');
  const gradOpacity = $('gOpacity');
  const gradColor = $('gColor');
  const startVal = $('gStartVal');
  const opacityVal = $('gOpacityVal');
  const hint = $('gHint');
  const IMG_RE = /\.(jpe?g|png|webp|bmp|gif|jfif|avif)$/i;

  let images = [];
  let currentIndex = 0;

  drop.addEventListener('click', () => fileInput.click());
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); loadFiles(e.dataTransfer.files); });
  fileInput.addEventListener('change', e => loadFiles(e.target.files));

  gradStart.addEventListener('input', () => { startVal.textContent = gradStart.value + '%'; render(); });
  gradOpacity.addEventListener('input', () => { opacityVal.textContent = gradOpacity.value + '%'; render(); });
  gradColor.addEventListener('input', render);

  function thumbURL(bmp) {
    const s = 56, c = document.createElement('canvas');
    c.width = s; c.height = s;
    const k = Math.max(s / bmp.width, s / bmp.height), w = bmp.width * k, h = bmp.height * k;
    c.getContext('2d').drawImage(bmp, (s - w) / 2, (s - h) / 2, w, h);
    return c.toDataURL('image/jpeg', 0.7);
  }

  async function loadFiles(files) {
    images = [];
    thumbsEl.innerHTML = '';
    currentIndex = 0;
    canvas.style.display = 'none';
    btnDownload.hidden = true;
    hint.style.display = '';
    const arr = Array.from(files).filter(f => /^image\//.test(f.type) || IMG_RE.test(f.name));
    for (const file of arr) {
      let bmp;
      try { bmp = await createImageBitmap(file); }
      catch (e) { continue; }
      images.push({ img: bmp, name: file.name });
      const idx = images.length - 1;
      const thumb = document.createElement('div');
      thumb.className = 'thumb' + (idx === 0 ? ' active' : '');
      thumb.innerHTML = '<img src="' + thumbURL(bmp) + '">';
      thumb.addEventListener('click', () => {
        thumbsEl.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
        currentIndex = idx;
        render();
      });
      thumbsEl.appendChild(thumb);
      if (idx === 0) render();
    }
    fileCount.textContent = images.length > 1
      ? images.length + ' фото завантажено'
      : (images.length === 0 && arr.length > 0 ? 'Не вдалося відкрити фото' : '');
    btnAll.hidden = images.length < 2;
  }

  function hexToRgb(hex) {
    return { r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) };
  }

  function applyGradient(src) {
    canvas.width = src.width;
    canvas.height = src.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(src, 0, 0);
    const startY = canvas.height * (gradStart.value / 100);
    const opacity = gradOpacity.value / 100;
    const { r, g, b } = hexToRgb(gradColor.value);
    const grad = ctx.createLinearGradient(0, startY, 0, canvas.height);
    grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',0)');
    grad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function render() {
    if (!images[currentIndex]) return;
    applyGradient(images[currentIndex].img);
    canvas.style.display = 'block';
    hint.style.display = 'none';
    btnDownload.hidden = false;
  }

  btnDownload.addEventListener('click', () => {
    if (!images[currentIndex]) return;
    render();
    const a = document.createElement('a');
    a.download = images[currentIndex].name.replace(/\.[^.]+$/, '') + '_gradient.jpg';
    a.href = canvas.toDataURL('image/jpeg', 0.95);
    a.click();
  });

  btnAll.addEventListener('click', async () => {
    if (!images.length) return;
    btnAll.textContent = 'Обробляю…';
    try {
      const zip = new JSZip();
      for (let i = 0; i < images.length; i++) {
        applyGradient(images[i].img);
        const b64 = canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
        zip.file(images[i].name.replace(/\.[^.]+$/, '') + '_gradient.jpg', b64, { base64: true });
      }
      render();
      const blob = await zip.generateAsync({ type: 'blob' });
      download(blob, 'gradient_images.zip');
    } finally {
      btnAll.textContent = '↓ Завантажити всі як ZIP';
    }
  });
})();
