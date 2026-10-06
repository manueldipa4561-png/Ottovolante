/* Work index: giant typographic rows, a cursor-following preview (still or live video), and a full-screen "projector" lightbox. */
(function () {
  'use strict';
  const O = window.O, { $, $$ } = O;
  const FILMS = [
    { t: 'Sole Nero',     b: 'Caffè Marcello',   c: 'Spot 30″',    y: '2026', img: 'sole-nero' },
    { t: 'Scatto',        b: 'Veloce Sneakers',  c: 'Campaign',    y: '2026', img: 'scatto' },
    { t: 'Mare Dentro',   b: 'Acqua di Nerea',   c: 'Brand film',  y: '2025', img: 'mare-dentro' },
    { t: 'Notte Rossa',   b: 'Lia Montrésor',    c: 'Music video', y: '2025', img: 'notte-rossa' },
    { t: 'Quattro Ruote', b: 'Lancetta Motors',  c: 'Spot 45″',    y: '2025', img: 'quattro-ruote', video: 'quattro-ruote' },
    { t: 'Fuoco Lento',   b: 'Osteria Brace',    c: 'Brand film',  y: '2024', img: 'fuoco-lento',   video: 'fuoco-lento' }
  ];
  const W = { rows: [], pv: [], cur: -1, open: -1, px: -999, py: -999, tx: -999, ty: -999, pw: 0, ph: 0, prev: null, list: null, lb: null };

  const mediaHTML = f => f.video
    ? `<video src="assets/video/${f.video}.mp4" poster="assets/img/${f.img}.jpg" autoplay muted loop playsinline preload="auto"></video>`
    : `<img src="assets/img/${f.img}.jpg" alt="${f.t}">`;

  function hover(i) {
    W.cur = i; W.list.classList.toggle('hov', i >= 0); W.prev.classList.toggle('show', i >= 0);
    W.rows.forEach((r, k) => r.classList.toggle('on', k === i));
    W.pv.forEach((p, k) => { p.classList.toggle('on', k === i); const v = p.querySelector('video'); if (v) { if (k === i) v.play().catch(() => {}); else v.pause(); } });
    if (i >= 0 && !O.S.mouse) { const r = W.rows[i].getBoundingClientRect(); W.tx = O.S.vw * 0.6; W.ty = r.top + r.height / 2 - W.ph / 2; }   // hands-free tour: park the preview beside the row
  }

  function openFilm(i, x, y) {
    i = (i + FILMS.length) % FILMS.length; const f = FILMS[i];
    W.open = i; W.lb.style.setProperty('--x', (x == null ? O.S.vw / 2 : x) + 'px'); W.lb.style.setProperty('--y', (y == null ? O.S.vh / 2 : y) + 'px');
    $('#lb-media').innerHTML = mediaHTML(f);
    $('#lb-n').textContent = `${String(i + 1).padStart(2, '0')} / 0${FILMS.length} — ${f.c}`; $('#lb-t').textContent = f.t; $('#lb-m').textContent = `${f.b} × Ottovolante, ${f.y}`;
    W.lb.classList.add('open'); W.lb.setAttribute('aria-hidden', 'false'); document.body.classList.add('lock'); hover(-1);
  }
  function closeFilm() {
    if (W.open < 0) return; W.open = -1; W.lb.classList.remove('open'); W.lb.setAttribute('aria-hidden', 'true'); document.body.classList.remove('lock');
    setTimeout(() => { if (W.open < 0) $('#lb-media').innerHTML = ''; }, 900);
  }

  function measure() { W.pw = W.prev.offsetWidth; W.ph = W.prev.offsetHeight; }

  function init() {
    W.list = $('#index'); W.prev = $('#preview'); W.lb = $('#lightbox');
    FILMS.forEach((f, i) => {
      const li = document.createElement('li'); li.className = 'ri'; li.dataset.cursor = 'view'; li.tabIndex = 0;
      li.innerHTML = `<span class="n">${String(i + 1).padStart(2, '0')}</span><h3 class="t">${f.t}</h3><span class="brand">${f.b}</span><span class="cat">${f.c}</span><span class="yr">${f.y}</span><img class="th" src="assets/img/${f.img}.jpg" alt="" loading="lazy">`;
      W.list.appendChild(li); W.rows.push(li);
      const pv = document.createElement('div'); pv.className = 'pv';
      pv.innerHTML = f.video ? `<video src="assets/video/${f.video}.mp4" poster="assets/img/${f.img}.jpg" muted loop playsinline preload="metadata"></video>` : `<img src="assets/img/${f.img}.jpg" alt="">`;
      W.prev.appendChild(pv); W.pv.push(pv);
      li.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hover(i); });
      li.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hover(-1); });
      li.addEventListener('click', e => openFilm(i, e.clientX, e.clientY));
      li.addEventListener('keydown', e => { if (e.key === 'Enter') openFilm(i); });
    });
    $('#lb-close').addEventListener('click', closeFilm);
    $('#lb-prev').addEventListener('click', () => openFilm(W.open - 1)); $('#lb-next').addEventListener('click', () => openFilm(W.open + 1));
    addEventListener('keydown', e => {
      if (W.open < 0) return;
      if (e.key === 'Escape') closeFilm(); else if (e.key === 'ArrowLeft') openFilm(W.open - 1); else if (e.key === 'ArrowRight') openFilm(W.open + 1);
    });
    measure();
  }

  function frame(dt) {
    if (W.cur >= 0 && O.S.mouse) {
      W.tx = O.S.mx + 30; W.ty = O.S.my - W.ph / 2;
      if (W.tx + W.pw > O.S.vw - 12) W.tx = O.S.mx - W.pw - 30;
    }
    if (W.px < -900) { W.px = W.tx; W.py = W.ty; }
    const nx = O.damp(W.px, W.tx, 11, dt), ny = O.damp(W.py, W.ty, 11, dt), rot = O.clamp((nx - W.px) * 0.35, -9, 9);
    W.px = nx; W.py = ny;
    W.prev.style.transform = `translate3d(${nx.toFixed(1)}px,${ny.toFixed(1)}px,0) rotate(${rot.toFixed(2)}deg)`;
  }

  O.work = { hover, open: openFilm, close: closeFilm };
  O.mods.push({ init, frame, resize: () => W.prev && measure() });
})();
