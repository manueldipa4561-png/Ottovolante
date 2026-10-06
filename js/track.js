/* The rollercoaster: a sinuous track with loop-the-loops runs the full height of the page.
   The rail draws itself ahead of a three-cart train that rides your scroll (upside down in the loops). */
(function () {
  'use strict';
  const O = window.O, NS = 'http://www.w3.org/2000/svg';
  const T = { g: null, rail: null, ties: null, train: null, L: 0, H: 0, W: 0, carts: [] };
  const CARTS = 3, GAP = 58;

  /* Path: x = cx + Ax*cos(th), dy/dth = R - sum(s_k * D_k(th) * cos(th)); each D_k is a Gaussian bump that makes dy go negative,
     i.e. the track doubles back on itself: a loop-the-loop at the left (s = -1) or right (s = +1) edge. */
  function buildPath(W, H) {
    const cx = W / 2, Ax = W * (W < 700 ? 0.36 : 0.34), R = O.clamp(W * 0.115, 56, 165), dTh = 0.04, TAU = Math.PI * 2;
    const thEst = H / R + Math.PI, loops = [{ f: 0.26, s: 1 }, { f: 0.5, s: -1 }, { f: 0.76, s: 1 }].map(l => {
      const raw = Math.PI + l.f * thEst, base = l.s > 0 ? Math.round(raw / TAU) * TAU : Math.round((raw - Math.PI) / TAU) * TAU + Math.PI;
      return { th: base, s: l.s };
    });
    const D = (th) => loops.reduce((a, l) => a + l.s * 3.2 * R * Math.exp(-Math.pow((th - l.th) / 1.0, 2)), 0);
    let th = Math.PI, y = O.S.vh * 0.2, d = '', guard = 0;                  // starts below the nav so the train never sits on the logo
    while (y < H + R && guard++ < 40000) {
      const x = cx + Ax * Math.cos(th); d += (d ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
      y += (R - D(th) * Math.cos(th)) * dTh; th += dTh;
    }
    return d;
  }

  function makeCart() {
    const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'cart');
    g.innerHTML = '<rect x="-24" y="-13" width="48" height="22" rx="8"/><path d="M-4 -13h12l5 -9h-14z"/><circle cx="-13" cy="12" r="5.5"/><circle cx="13" cy="12" r="5.5"/>';
    return g;
  }

  function build() {
    const W = O.S.vw, H = Math.max(document.documentElement.scrollHeight, O.S.vh * 2);
    T.W = W; T.H = H;
    const d = buildPath(W, H);
    T.rail.setAttribute('d', d); T.ties.setAttribute('d', d);
    T.L = T.rail.getTotalLength();
    T.rail.style.strokeDasharray = T.L;
  }

  function init() {
    T.g = document.getElementById('trackg'); T.rail = document.getElementById('track-rail'); T.ties = document.getElementById('track-ties'); T.train = document.getElementById('train');
    for (let i = 0; i < CARTS; i++) { const c = makeCart(); T.train.appendChild(c); T.carts.push(c); }
    build();
  }

  let check = 0;
  function frame() {
    const S = O.S, doc = document.documentElement, max = Math.max(1, doc.scrollHeight - S.vh), prog = O.clamp(S.sy / max, 0, 1);
    if (++check % 90 === 0 && Math.abs(doc.scrollHeight - T.H) > 24) build();            // page grew (fonts, images): re-lay the track
    const len = prog * T.L;
    T.g.setAttribute('transform', `translate(0,${(-S.sy).toFixed(1)})`);
    T.rail.style.strokeDashoffset = T.L - Math.min(T.L, len + T.L * 0.045);
    T.carts.forEach((c, i) => {
      const l = O.clamp(len - i * GAP, 2, T.L - 2), p = T.rail.getPointAtLength(l), a = T.rail.getPointAtLength(l - 3), b = T.rail.getPointAtLength(l + 3);
      c.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${(Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI).toFixed(1)})`);
    });
  }

  O.mods.push({ init, frame, resize: () => T.g && build() });
})();
