// Sarmal — içe doğru sarmal harita (SVG) ve piyonların kare kare zıplayarak ilerlemesi.
// Board.create() -> { svg, update(view) }: svg ekranlar arasında aynı kalır, böylece animasyon yeniden çizimde kesilmez.
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const OUT = 176, IN = 46, TURNS = 3, STEP_MS = 300, HOP = 18;
  const el = (tag, attrs, text) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  };

  // n kare sarmal üzerinde eşit aralıklı (yay uzunluğuna göre), dıştan içe; n. nokta merkez (bitiş)
  function points(n) {
    const S = 3000, samples = [];
    let acc = 0, prev = null;
    for (let i = 0; i <= S; i++) {
      const th = TURNS * 2 * Math.PI * i / S - Math.PI / 2, r = OUT - (OUT - IN) * i / S;
      const p = [r * Math.cos(th), r * Math.sin(th)];
      if (prev) acc += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
      samples.push([p, acc]); prev = p;
    }
    const pts = [];
    for (let k = 0, j = 0; k < n; k++) {
      const want = acc * k / (n - 1);
      while (j < S && samples[j][1] < want) j++;
      pts.push(samples[j][0]);
    }
    pts.push([0, 0]);
    return pts;
  }

  function create() {
    const svg = el('svg', { viewBox: '-200 -200 400 400', class: 'board', role: 'img', 'aria-label': 'Sarmal oyun haritası' });
    const N = Game.N, pts = points(N);
    let id = null, pawns = [], shown = [], target = [], busy = false;

    function build(V) {
      svg.replaceChildren();
      svg.append(el('path', { class: 'track', d: 'M' + pts.map(p => p.map(v => v.toFixed(1)).join(' ')).join(' L') }));
      V.board.forEach((mode, i) => {
        const [x, y] = pts[i];
        svg.append(el('circle', { class: 'sq m-' + mode, cx: x, cy: y, r: 17 }));
        svg.append(el('text', { class: 'ico', x, y }, Game.MODES[mode].icon));
      });
      const [sx, sy] = pts[0];
      svg.append(el('text', { class: 'lbl', x: sx - 50, y: sy + 1 }, 'BAŞLA'));
      svg.append(el('circle', { class: 'finish', cx: 0, cy: 0, r: 25 }));
      svg.append(el('text', { class: 'ico big', x: 0, y: 0 }, '🏁'));
      pawns = V.teams.map(t => {
        const g = el('g', { class: 'pawn' });
        g.append(el('circle', { class: 'ring', r: 15, stroke: t.color }));
        g.append(el('circle', { class: 'body', r: 10.5, fill: t.color }));
        g.append(el('text', { class: 'ini' }, t.name[0]));
        svg.append(g);
        return g;
      });
      shown = V.teams.map(t => t.pos);
      layout();
    }

    function put(g, x, y, s = 1) { g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(3)})`); }
    function layout() {   // aynı karedeki piyonlar küçük bir halkada yan yana durur
      pawns.forEach((g, i) => {
        const same = shown.map((p, j) => p === shown[i] ? j : -1).filter(j => j >= 0), k = same.indexOf(i);
        const a = 2 * Math.PI * k / same.length - Math.PI / 2, d = same.length > 1 ? 9 : 0;
        put(g, pts[shown[i]][0] + d * Math.cos(a), pts[shown[i]][1] + d * Math.sin(a));
      });
    }
    const hop = (g, a, b) => new Promise(done => {
      const t0 = performance.now(), [ax, ay] = pts[a], [bx, by] = pts[b];
      let over = false;
      const fin = () => { if (!over) { over = true; put(g, bx, by); done(); } };
      setTimeout(fin, STEP_MS + 150);   // gizli sekmede kareler durur: adım yine de tamamlansın, piyon yolda kalmasın
      (function frame(now) {
        if (over) return;
        const k = Math.min(1, (now - t0) / STEP_MS), lift = Math.sin(Math.PI * k);
        put(g, ax + (bx - ax) * k, ay + (by - ay) * k - lift * HOP, 1 + 0.3 * lift);
        if (k < 1) requestAnimationFrame(frame); else fin();
      })(t0);
    });
    async function walk() {   // bir piyon hedefine varmadan sıradaki yola çıkmaz
      busy = true;
      for (let i; (i = target.findIndex((p, j) => p !== shown[j])) >= 0;) {
        const g = pawns[i];
        g.classList.add('moving');
        svg.append(g);   // yürüyen piyon en üstte görünsün
        while (shown[i] !== target[i]) {
          const next = shown[i] + Math.sign(target[i] - shown[i]);
          await hop(g, shown[i], next);
          shown[i] = next;
        }
        g.classList.remove('moving');
        layout();
      }
      busy = false;
    }

    function update(V) {
      if (V.id !== id) { id = V.id; build(V); }   // yeni oyun ya da sayfa yeni açıldı: piyonlar olduğu yerde başlar
      pawns.forEach((g, i) => g.classList.toggle('turn', V.phase === 'ready' && i === V.turn));
      target = V.teams.map(t => t.pos);
      if (!busy) walk();
    }
    return { svg, update };
  }

  window.Board = { create, points };
})();
