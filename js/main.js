/* Ottovolante core: smooth scroll values, loader, cursor, hero, tickers, manifesto, reveals, hands-free tour.
   URL flags: ?auto (hands-free scroll tour for screen recording), ?clean (no loader / nav / cursor). */
(function () {
  'use strict';
  const q = new URLSearchParams(location.search);
  const O = window.O = { mods: [] };
  O.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  O.lerp = (a, b, t) => a + (b - a) * t;
  O.damp = (c, t, r, dt) => c + (t - c) * (1 - Math.exp(-r * dt));
  O.ease = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  O.smooth = (a, b, v) => { const t = O.clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  O.$ = (s, r) => (r || document).querySelector(s);
  O.$$ = (s, r) => [...(r || document).querySelectorAll(s)];
  O.touch = matchMedia('(hover: none), (pointer: coarse)').matches;
  O.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  O.AUTO = q.has('auto'); O.CLEAN = q.has('clean');
  const S = O.S = { y: 0, py: 0, sy: 0, vs: 0, sdir: 1, vw: innerWidth, vh: innerHeight, mx: innerWidth * 0.7, my: innerHeight * 0.4, mouse: false };
  const { $, $$, clamp, lerp, damp, ease, smooth } = O;
  if (O.CLEAN) document.body.classList.add('clean');

  /* ---------- loader: film-leader countdown 8 -> 1, then an iris wipe ---------- */
  function runLoader() {
    const L = $('#loader'), n = $('#ld-num'); let i = 8;
    if (O.CLEAN) return Promise.resolve();
    document.body.classList.add('lock');
    return new Promise(done => {
      (function step() {
        n.textContent = i; n.classList.remove('flick'); void n.offsetWidth; n.classList.add('flick'); L.dataset.s = (8 - i) % 4;
        if (i === 1) { setTimeout(() => { L.classList.add('out'); document.body.classList.remove('lock'); setTimeout(done, 380); }, 440); return; }
        i--; setTimeout(step, 250);
      })();
    });
  }

  /* ---------- hero: variable-font wordmark + showreel capsule that expands to fullscreen ---------- */
  const H = { el: $('#hero'), stage: $('.stage'), reel: $('#reel'), vid: $('#reel-video'), mega: $('#mega'), slot: $('#slot'), foot: $('.hero-foot'), letters: [], rect: null, paused: false };
  function splitLetters() {
    $$('[data-split]').forEach(w => {
      const txt = w.textContent; w.textContent = '';
      [...txt].forEach(ch => { const s = document.createElement('span'); s.className = 'l'; s.textContent = ch; s.k = 0; w.appendChild(s); H.letters.push(s); });
    });
  }
  function introLetters() {
    H.letters.forEach((l, i) => l.animate([{ transform: 'translateY(70%) rotate(7deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 950, delay: i * 55, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }));
    [H.foot, $('.badge')].forEach(el => el && el.animate([{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { duration: 900, delay: 700, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }));
  }
  function measureSlot() {
    const a = H.slot.getBoundingClientRect(), s = H.stage.getBoundingClientRect();
    H.rect = { left: a.left - s.left, top: a.top - s.top, right: a.right - s.left, bottom: a.bottom - s.top, height: a.height };
  }
  function heroFrame(dt, t) {
    const runway = H.el.offsetHeight - S.vh, p = clamp(S.sy / runway, 0, 1), e = ease(p);
    if (!H.rect) measureSlot();
    const W = H.stage.clientWidth, Hh = H.stage.clientHeight, r = H.rect, k = 1 - e;
    H.reel.style.clipPath = `inset(${r.top * k}px ${(W - r.right) * k}px ${(Hh - r.bottom) * k}px ${r.left * k}px round ${r.height / 2 * k}px)`;
    H.reel.classList.toggle('full', p > 0.9);
    H.mega.style.transform = `translate3d(0,${-e * 9}vh,0) scale(${1 - e * 0.1})`; H.mega.style.transformOrigin = '0 0';
    H.mega.style.opacity = 1 - smooth(0.28, 0.72, p); H.foot.style.opacity = 1 - smooth(0.05, 0.3, p);
    const off = S.y > H.el.offsetHeight + S.vh * 0.2;                                           // pause the reel video when it's far off screen
    if (off !== H.paused) { H.paused = off; off ? H.vid.pause() : H.vid.play().catch(() => {}); }
    if (p < 0.6) {                                                                              // letters stretch near the cursor + a travelling wave
      const rects = H.letters.map(l => l.getBoundingClientRect());
      H.letters.forEach((l, i) => {
        const b = rects[i], cx = b.left + b.width / 2, cy = b.top + b.height / 2;
        const near = S.mouse ? clamp(1 - Math.hypot(S.mx - cx, (S.my - cy) * 0.55) / (S.vw * 0.2), 0, 1) : 0;
        const wave = 0.5 + 0.5 * Math.sin(t * 1.5 - i * 0.6);
        l.k = damp(l.k, Math.max(near, wave * 0.5), 9, dt);
        l.style.fontVariationSettings = `'opsz' 96,'wdth' ${(84 + 16 * l.k).toFixed(1)},'wght' ${(520 + 280 * l.k) | 0}`;
      });
    }
  }

  /* ---------- tickers (speed follows scroll velocity, direction follows scroll direction) ---------- */
  const tickers = [];
  function setupTickers() {
    $$('.tk').forEach(el => {
      const inn = el.querySelector('.tk-in'), w0 = inn.scrollWidth, n = Math.ceil(S.vw * 2 / w0) + 1;
      for (let i = 0; i < n; i++) el.appendChild(inn.cloneNode(true));
      tickers.push({ el, w0, dir: +el.dataset.dir, x: 0, outs: $$('.tk-in', el) });
    });
  }
  function tickerFrame(dt) {
    tickers.forEach(t => {
      const speed = 70 + Math.abs(S.vs) * 55;
      t.x += t.dir * S.sdir * speed * dt;
      if (t.x <= -t.w0) t.x += t.w0; if (t.x > 0) t.x -= t.w0;
      const tf = `translate3d(${t.x}px,0,0)`; t.outs.forEach(o => { o.style.transform = tf; });
    });
  }

  /* ---------- manifesto: words light up as you read, counters, reveals ---------- */
  const M = { el: $('#mani'), words: [], lit: -1 };
  function splitManifesto() {
    const txt = M.el.textContent.trim(); M.el.textContent = '';
    txt.split(/\s+/).forEach(w => {
      const s = document.createElement('span'); s.className = 'w' + (/^(drop|lift|loop|ride|stomach|numbers|straight)/i.test(w) ? ' hl' : ''); s.textContent = w + ' ';
      M.el.appendChild(s); M.words.push(s);
    });
  }
  function manifestoFrame() {
    const r = M.el.getBoundingClientRect(), p = clamp((S.vh * 0.85 - r.top) / (r.height + S.vh * 0.25), 0, 1), n = Math.round(p * M.words.length * 1.1);
    if (n !== M.lit) { M.lit = n; M.words.forEach((w, i) => w.classList.toggle('on', i < n)); }
  }
  function setupObservers() {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return; const el = e.target; io.unobserve(el);
      el.style.transitionDelay = (el.dataset.d || 0) + 's'; el.classList.add('in');
      if (el.classList.contains('count') || el.querySelector('.count')) countUp(el.classList.contains('count') ? el : el.querySelector('.count'));
    }), { threshold: 0.2 });
    $$('[data-reveal]').forEach((el, i) => { el.dataset.d = ((i % 3) * 0.1).toFixed(2); io.observe(el); });
  }
  function countUp(el) {
    const to = +el.dataset.to, t0 = performance.now(), dur = 1500;
    (function tick(now) { const u = clamp((now - t0) / dur, 0, 1); el.textContent = Math.round(to * (1 - Math.pow(1 - u, 3))); if (u < 1) requestAnimationFrame(tick); })(t0);
  }

  /* ---------- cursor ---------- */
  const C = { el: $('#cursor'), lab: $('#cursor-label'), x: -100, y: -100 };
  function setupCursor() {
    if (O.touch) return;
    addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; S.mx = e.clientX; S.my = e.clientY; if (!S.mouse) { S.mouse = true; document.documentElement.classList.add('has-cursor'); C.x = S.mx; C.y = S.my; } });
    document.addEventListener('pointerover', e => {
      const t = e.target.closest && e.target.closest('[data-cursor]'), m = t ? t.dataset.cursor : '';
      C.el.classList.toggle('big', m === 'view' || m === 'ticket'); C.el.classList.toggle('link', m === 'link');
      C.lab.textContent = m === 'view' ? 'View' : m === 'ticket' ? 'Ride' : '';
    });
  }

  /* ---------- nav: hides on the way down, returns on the way up ---------- */
  function navFrame() {
    const dy = S.y - S.py, nav = $('#nav');
    if (S.y > 160 && dy > 4) nav.classList.add('hide'); else if (dy < -4 || S.y < 160) nav.classList.remove('hide');
  }

  /* ---------- hands-free tour (?auto): scrolls the whole page, hovers the work rows, opens a film ---------- */
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  function glide(to, ms) {
    return new Promise(res => { const from = scrollY, t0 = performance.now(); (function step(now) { const u = clamp((now - t0) / ms, 0, 1); scrollTo(0, from + (to - from) * ease(u)); u < 1 ? requestAnimationFrame(step) : res(); })(t0); });
  }
  async function tour() {
    for (;;) {
      await glide(0, 1); await sleep(1800);
      await glide(H.el.offsetHeight - S.vh, 3600); await sleep(1500);
      const mani = $('.manifesto'); await glide(mani.offsetTop + mani.offsetHeight * 0.45, 4200); await sleep(1200);
      const work = $('.work'); await glide(work.offsetTop + 180, 2600);
      if (O.work) { for (let i = 0; i < 6; i++) { O.work.hover(i); await sleep(1050); } O.work.hover(-1); await glide(work.offsetTop + 380, 1200); O.work.open(5); await sleep(3800); O.work.close(); await sleep(1000); }
      await glide($('.giro').offsetTop + 60, 2800); await sleep(2800);
      await glide(document.documentElement.scrollHeight - S.vh, 3400); await sleep(2800);
    }
  }

  /* ---------- boot + frame loop ---------- */
  function resize() { S.vw = innerWidth; S.vh = innerHeight; H.rect = null; O.mods.forEach(m => m.resize && m.resize()); }
  let rt = 0; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 120); });
  let last = performance.now(), time = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
    S.y = scrollY; S.sy = damp(S.sy, S.y, 9, dt); const dv = S.y - S.py; S.vs = damp(S.vs, dv, 8, dt); if (Math.abs(dv) > 1) S.sdir = dv > 0 ? 1 : -1;
    heroFrame(dt, time); tickerFrame(dt); manifestoFrame(); navFrame();
    O.mods.forEach(m => m.frame && m.frame(dt, time));
    if (S.mouse) { C.x = lerp(C.x, S.mx, 0.22); C.y = lerp(C.y, S.my, 0.22); C.el.style.transform = `translate3d(${C.x}px,${C.y}px,0)`; }
    S.py = S.y;
  }
  async function boot() {
    if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, sleep(1500)]);
    splitLetters(); splitManifesto(); setupTickers(); setupObservers(); setupCursor();
    O.mods.forEach(m => m.init && m.init());
    measureSlot(); S.y = S.sy = S.py = scrollY; requestAnimationFrame(frame);
    await runLoader(); introLetters();
    if (O.AUTO) tour();
  }
  addEventListener('load', boot);
  history.scrollRestoration = 'manual'; scrollTo(0, 0);
})();
