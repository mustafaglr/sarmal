// Sarmal — 3D harita: içe doğru sarmal yol, mod kareleri, takım piyonları, kare kare zıplayarak ilerleme.
// Petek Diyarı'ndaki gibi düşük poligonlu modeller birkaç basit şekilden üretilir; hiçbir dosya yüklenmez.
// window.Board = { create() -> { el, update(view) }, icon(mode) -> ekrandaki ikonlar için küçük resim adresi ('' = WebGL yok) }
import * as THREE from 'three';

const TAU = Math.PI * 2, N = Game.N;
const OUT = 5.4, IN = 1.55, TURNS = 3, SQ = .52, TOP = .18, PAWN = 1.45;      // dış/iç yarıçap, sarmal tur sayısı, kare yarıçapı, kare üstü yüksekliği
const MODE = { anlat: 0xf59e0b, ciz: 0x38bdf8, limit: 0xc084fc, mime: 0x4ade80 };
const RAW = {
  box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(1, 1, 1, 12), disc: new THREE.CylinderGeometry(1, 1, 1, 30), round: new THREE.CylinderGeometry(1, 1, 1, 72),
  hex: new THREE.CylinderGeometry(1, 1, 1, 6), cone: new THREE.ConeGeometry(1, 1, 12), ball: new THREE.IcosahedronGeometry(1, 2),
  ico: new THREE.IcosahedronGeometry(1, 0), torus: new THREE.TorusGeometry(1, .22, 6, 18),
};
const POS = Object.fromEntries(Object.entries(RAW).map(([k, g]) => [k, (g.index ? g.toNonIndexed() : g).attributes.position]));
const MAT = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
const lerp = (a, b, k) => a + (b - a) * k, out = k => 1 - (1 - k) ** 3, back = k => 1 + 2.7 * (k - 1) ** 3 + 1.7 * (k - 1) ** 2;
const shade = (c, f) => new THREE.Color(c).multiplyScalar(f), tint = (c, f) => new THREE.Color(c).lerp(new THREE.Color(0xffffff), f);
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Birçok renkli basit şekli TEK örgüye pişirir (her parça tek çizim çağrısı).
// add(şekil, renk, x, y, z, sx, sy, sz, rx, ry, rz); at(x, y, z, ry, ölçek, fn) iç içe dönüşüm.
function build(fn) {
  const pos = [], col = [], stack = [new THREE.Matrix4()], m = new THREE.Matrix4(), v = new THREE.Vector3(), s = new THREE.Vector3();
  const q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  const add = (shape, color, x, y, z, sx, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) => {
    m.compose(v.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), s.set(sx, sy, sz)).premultiply(stack[stack.length - 1]);
    const p = POS[shape]; c.set(color);
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m); pos.push(v.x, v.y, v.z); col.push(c.r, c.g, c.b); }
  };
  const at = (x, y, z, ry, sc, f) => {
    stack.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(sc, sc, sc)).premultiply(stack[stack.length - 1]));
    f(); stack.pop();
  };
  fn(add, at);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, MAT);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

// ---------- modeller (birim boyut ≈ bir kare) ----------
const MODEL = {
  anlat(add) {                                      // konuşma balonu, içinde üç nokta
    const c = 0xfff4dc;
    add('ball', c, 0, .42, 0, .34, .26, .16);
    add('cone', c, -.15, .17, 0, .07, .17, .06, 0, 0, 2.6);
    for (const x of [-.12, 0, .12]) add('ball', 0xf59e0b, x, .42, .15, .045);
  },
  ciz(add) {                                        // kurşun kalem, ucu sol altta
    const a = -.85, ux = -Math.sin(a), uy = Math.cos(a), at = d => [ux * d, .36 + uy * d, 0];
    add('hex', 0xfbbf24, ...at(0), .07, .42, .07, 0, 0, a);
    add('cyl', 0xd1d5db, ...at(.235), .074, .05, .074, 0, 0, a);
    add('cyl', 0xf472b6, ...at(.29), .07, .07, .07, 0, 0, a);
    add('cone', 0xf3d2a2, ...at(-.27), .07, .12, .07, 0, 0, a + Math.PI);
    add('cone', 0x374151, ...at(-.315), .026, .04, .026, 0, 0, a + Math.PI);
  },
  limit(add) {                                      // abaküs: kelime hakkı boncukları
    const wood = 0x9a6532;
    add('box', wood, 0, .03, 0, .64, .06, .16);
    for (const x of [-.29, .29]) add('cyl', wood, x, .27, 0, .03, .48, .03);
    add('box', wood, 0, .52, 0, .66, .05, .08);
    [[.21, -.18, 4], [.37, .02, 3]].forEach(([y, x0, n]) => {
      add('cyl', 0xd1d5db, 0, y, 0, .012, .56, .012, 0, 0, Math.PI / 2);
      for (let i = 0; i < n; i++) add('ball', [0xc084fc, 0xf472b6, 0xfbbf24, 0x38bdf8][i], x0 + i * .1, y, 0, .056, .05, .05);
    });
  },
  mime(add) {                                       // pandomim sanatçısı: çizgili tişört, bere, görünmez duvara dayanmış eller
    for (const x of [-.045, .045]) add('cyl', 0x1f2937, x, .09, 0, .032, .18, .032);
    for (let i = 0; i < 4; i++) add('cyl', i % 2 ? 0xf9fafb : 0x111827, 0, .2 + i * .05, 0, .085, .05, .07);
    add('ball', 0xfafafa, 0, .5, 0, .1);
    add('cyl', 0x111827, .015, .595, 0, .11, .03, .11, 0, 0, -.25);
    for (const x of [-.035, .035]) add('ball', 0x111827, x, .51, .088, .014);
    add('box', 0xdc2626, 0, .455, .092, .04, .012, .01);
    for (const s of [-1, 1]) {
      add('cyl', 0xf9fafb, s * .13, .43, .03, .024, .2, .024, 0, 0, s * -.5);
      add('ball', 0xffffff, s * .18, .53, .04, .048, .055, .028);
    }
  },
};
function trophy(add) {
  const G = 0xf2b632, D = 0xc98e1c;
  add('disc', 0x3b2f6e, 0, .12, 0, .62, .24, .62);
  add('disc', 0x6b5bc4, 0, .25, 0, .56, .03, .56);
  add('box', D, 0, .33, 0, .26, .12, .26);
  add('cyl', G, 0, .48, 0, .045, .2, .045);
  add('cone', G, 0, .74, 0, .22, .36, .22, Math.PI);
  add('cyl', G, 0, .93, 0, .23, .03, .23);
  for (const s of [-1, 1]) add('torus', G, s * .23, .78, 0, .08);
  add('ico', 0xfff3b0, 0, 1.07, 0, .07);
}
function pawn(add, c) {
  add('cyl', shade(c, .65), 0, .03, 0, .2, .06, .2);
  add('cyl', c, 0, .09, 0, .17, .07, .17);
  add('cone', c, 0, .3, 0, .13, .38, .13);
  add('cyl', tint(c, .3), 0, .43, 0, .1, .035, .1);
  add('ball', c, 0, .54, 0, .11);
  add('ball', tint(c, .75), -.04, .58, .075, .024);
}
function flag(add) {                                // başlangıçta damalı bayrak
  add('cyl', 0xd1d5db, 0, .45, 0, .02, .9, .02);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) add('box', (i + j) % 2 ? 0x111827 : 0xffffff, .055 + i * .07, .8 - j * .07, 0, .07, .07, .012);
}

// kareler sarmal üzerinde eşit aralıklı (yay uzunluğuna göre), dıştan içe; N. nokta merkez (kupa)
function spiral() {
  const S = 3000, samples = [];
  let acc = 0, px = 0, pz = 0;
  for (let i = 0; i <= S; i++) {
    const th = TURNS * TAU * i / S - Math.PI / 2, r = OUT - (OUT - IN) * i / S, x = r * Math.cos(th), z = r * Math.sin(th);
    if (i) acc += Math.hypot(x - px, z - pz);
    samples.push([x, z, acc]); px = x; pz = z;
  }
  const pts = [];
  for (let k = 0, j = 0; k < N; k++) {
    while (j < S && samples[j][2] < acc * k / (N - 1)) j++;
    pts.push(new THREE.Vector3(samples[j][0], 0, samples[j][1]));
  }
  pts.push(new THREE.Vector3(0, 0, 0));
  return pts;
}

function lights(sc, shadows) {
  sc.add(new THREE.HemisphereLight(0xffffff, 0x6b5bc4, 1.7));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.3);
  sun.position.set(4, 10, 6);
  if (shadows) {
    sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -.0005; sun.shadow.normalBias = .02;
    Object.assign(sun.shadow.camera, { left: -7.5, right: 7.5, top: 7.5, bottom: -7.5, near: 1, far: 30 });
  }
  sc.add(sun);
}

// ---------- ekrandaki ikonlar: aynı modeller bir kez küçük, saydam resimlere çizilir ----------
let iconGL = null, iconScene, iconCam;
const icons = {};
function icon(mode) {
  if (mode in icons) return icons[mode];
  try {
    if (!iconGL) {
      iconGL = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      iconGL.setPixelRatio(1); iconGL.setSize(160, 160, false);
      iconScene = new THREE.Scene(); lights(iconScene, false);
      iconCam = new THREE.PerspectiveCamera(30, 1, .1, 50);
    }
    const m = build(add => MODEL[mode](add));
    m.geometry.computeBoundingSphere();
    const { center, radius } = m.geometry.boundingSphere;
    iconCam.position.copy(center).addScaledVector(new THREE.Vector3(.35, .45, 1).normalize(), radius / Math.sin(15 * Math.PI / 180) * .95);
    iconCam.lookAt(center);
    iconScene.add(m); iconGL.render(iconScene, iconCam); iconScene.remove(m); m.geometry.dispose();
    return (icons[mode] = iconGL.domElement.toDataURL());
  } catch (e) { return (icons[mode] = ''); }   // WebGL yok: ekran emojiye döner
}

function create() {
  const el = document.createElement('div');
  el.className = 'board3d';
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
  catch (e) {
    el.textContent = 'Bu telefonda 3D harita açılamadı; oyun yine oynanır, sıralama aşağıda.';
    el.classList.add('nogl');
    return { el, update() {} };
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  el.append(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
  lights(scene, true);

  const pts = spiral();
  const table = build(add => {                     // oyun tahtası: koyu mor yuvarlak, açık kenar
    add('round', 0x241d55, 0, -.16, 0, 6.5, .3, 6.5);
    add('round', 0x2f2672, 0, .005, 0, 6.3, .02, 6.3);
    add('torus', 0x4a3da0, 0, 0, 0, 6.42, 6.42, 1.4, Math.PI / 2);
  });
  table.castShadow = false;
  scene.add(table);
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p.x, .05, p.z)));
  const track = new THREE.Mesh(new THREE.TubeGeometry(curve, 600, .24, 8), new THREE.MeshLambertMaterial({ color: 0xf5ead5 }));
  track.scale.y = .35; track.receiveShadow = true;
  scene.add(track);
  const cup = build(add => trophy(add));
  cup.scale.setScalar(1.6);
  scene.add(cup);

  const fx = new THREE.Group(), tweens = new Set();
  scene.add(fx);
  const tween = (ms, f) => new Promise(done => {   // ilk karede başlar: harita görünmezken başlayan hareket, görününce oynar
    let t0 = null;
    const tw = now => { if (t0 === null) t0 = now; const k = Math.min(1, (now - t0) / ms); f(k); if (k >= 1) { tweens.delete(tw); done(); } };
    tweens.add(tw);
  });
  const dustMat = new THREE.MeshLambertMaterial({ color: 0xf5ead5, flatShading: true });
  function dust(p, n, spread) {
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + Math.random(), sp = spread * (.5 + Math.random()), m = new THREE.Mesh(RAW.ico, dustMat);
      fx.add(m);
      tween(480 + Math.random() * 200, k => {
        const e = out(k);
        m.position.set(p.x + Math.cos(a) * sp * e, TOP + Math.sin(k * Math.PI) * sp * .5, p.z + Math.sin(a) * sp * e);
        m.scale.setScalar(.07 * (1 - k) + .004);
      }).then(() => fx.remove(m));
    }
  }
  const ringGeo = new THREE.RingGeometry(.8, 1, 40).rotateX(-Math.PI / 2);
  function ring(p, color) {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false }));
    m.position.set(p.x, TOP + .01, p.z); fx.add(m);
    tween(520, k => { m.scale.setScalar(.15 + .55 * out(k)); m.material.opacity = .85 * (1 - k); }).then(() => { fx.remove(m); m.material.dispose(); });
  }
  function confetti() {
    const cols = [0xef4444, 0x3b82f6, 0x22c55e, 0xeab308, 0xa855f7, 0xf97316, 0xffffff];
    for (let i = 0; i < 90; i++) {
      const m = new THREE.Mesh(RAW.box, new THREE.MeshLambertMaterial({ color: cols[i % cols.length] }));
      const x = (Math.random() - .5) * 7, z = (Math.random() - .5) * 7, spin = Math.random() * 8, d = Math.random() * .6;
      m.scale.set(.09, .015, .14); fx.add(m);
      tween(2200 + Math.random() * 900, k => {
        const kk = Math.max(0, k - d * (1 - k));
        m.position.set(x + Math.sin(kk * 9 + spin) * .3, lerp(7, .1, kk), z);
        m.rotation.set(kk * spin * 3, kk * spin, kk * 5);
      }).then(() => { fx.remove(m); m.material.dispose(); });
    }
  }

  let id = null, board = null, pawns = [], colors = [], shown = [], target = [], busy = false, turn = -1, winner = -1;
  const turnRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
  turnRing.visible = false; scene.add(turnRing);

  function build3d(V) {
    if (board) { scene.remove(board); board.geometry.dispose(); }
    for (const p of pawns) { scene.remove(p); p.geometry.dispose(); }
    board = build((add, at) => {
      V.board.forEach((mode, i) => {
        const p = pts[i], c = MODE[mode];
        add('disc', shade(c, .62), p.x, .08, p.z, SQ, .16, SQ);
        add('disc', c, p.x, TOP - .005, p.z, SQ * .86, .02, SQ * .86);
        at(p.x, TOP, p.z - .12, 0, .85, () => MODEL[mode](add));
        const q = pts[i + 1], dx = q.x - p.x, dz = q.z - p.z, L = Math.hypot(dx, dz);   // yön oku: bir sonraki kareye
        at(p.x + dx * .5, .12, p.z + dz * .5, Math.atan2(dx, dz), 1, () => add('cone', 0xc9a86a, 0, 0, 0, .1, Math.min(.22, L * .2), .05, Math.PI / 2));
      });
      const s = pts[0], r = Math.hypot(s.x, s.z);
      at(s.x * (r + .75) / r - .1, 0, s.z * (r + .75) / r, 0, 1, () => flag(add));
    });
    scene.add(board);
    colors = V.teams.map(t => t.color);
    pawns = V.teams.map(t => { const m = build((add, at) => at(0, 0, 0, 0, PAWN, () => pawn(add, t.color))); scene.add(m); return m; });
    shown = V.teams.map(t => t.pos);
    layout();
  }
  // aynı karedeki piyonlar küçük bir halkada yan yana; merkezde kupanın etrafında durur
  function spot(pos, i, alone) {
    if (pos >= N) { const a = TAU * i / pawns.length + Math.PI / 2; return new THREE.Vector3(Math.cos(a) * .45, .28, Math.sin(a) * .45); }
    const same = alone ? [i] : shown.map((p, j) => p === pos ? j : -1).filter(j => j >= 0), k = same.indexOf(i), p = pts[pos];
    if (same.length === 1) return new THREE.Vector3(p.x, TOP, p.z + .14);
    const a = TAU * k / same.length + Math.PI / 2;
    return new THREE.Vector3(p.x + Math.cos(a) * .22, TOP, p.z + .04 + Math.sin(a) * .18);
  }
  function layout() { pawns.forEach((g, i) => { g.position.copy(spot(shown[i], i)); g.scale.setScalar(1); }); }

  let focus = 0, focusAt = new THREE.Vector3();
  async function hop(i, a, b) {
    const g = pawns[i], A = spot(a, i, true), B = spot(b, i, true), H = .9 + Math.abs(B.y - A.y);
    await tween(calm ? 120 : 300, k => {
      const lift = Math.sin(Math.PI * k);
      g.position.set(lerp(A.x, B.x, k), lerp(A.y, B.y, k) + lift * H, lerp(A.z, B.z, k));
      g.scale.set(1 - lift * .08, 1 + lift * .14, 1 - lift * .08);
      focusAt.copy(g.position);
    });
    dust(B, 5, .28);
    await tween(calm ? 40 : 110, k => { const s = Math.sin(Math.PI * k) * .22; g.scale.set(1 + s * .5, 1 - s, 1 + s * .5); });
  }
  async function walk() {                          // bir piyon hedefine varmadan sıradaki yola çıkmaz
    busy = true;
    for (let i; (i = target.findIndex((p, j) => p !== shown[j])) >= 0;) {
      focusAt.copy(pawns[i].position);
      await tween(350, k => { focus = Math.max(focus, out(k)); });
      while (shown[i] !== target[i]) {
        const next = shown[i] + Math.sign(target[i] - shown[i]);
        await hop(i, shown[i], next);
        shown[i] = next;
      }
      ring(pawns[i].position, colors[i]);
      layout();
      if (shown[i] >= N) confetti();
      await tween(700, k => { focus = 1 - out(k); });
    }
    busy = false;
  }

  function update(V) {
    if (V.id !== id) { id = V.id; build3d(V); }    // yeni oyun ya da sayfa yeni açıldı: piyonlar olduğu yerde başlar
    turn = V.phase === 'ready' ? V.turn : -1;
    if (V.winner >= 0 && winner !== V.winner && !busy && shown[V.winner] >= N) confetti();
    winner = V.winner;
    target = V.teams.map(t => t.pos);
    if (!busy) walk();
  }

  // ---------- kamera: bütün sarmal görünür; hafif salınır, yürüyen piyona yaklaşır ----------
  const POLAR = .68, dir = new THREE.Vector3(0, Math.cos(POLAR), Math.sin(POLAR)), home = { d: 16, t: new THREE.Vector3(0, 0, .2) };
  let lw = 0, lh = 0;
  function fit() {
    const cam = camera.clone(), v = new THREE.Vector3(), ring = [];
    for (let i = 0; i < 24; i++) ring.push(new THREE.Vector3(Math.cos(i / 24 * TAU) * 6.05, 0, Math.sin(i / 24 * TAU) * 6.05));   // sarmalın dış kenarı; tahtanın kenarı biraz taşabilir
    ring.push(new THREE.Vector3(0, 1.9, 0), new THREE.Vector3(0, 1.3, -5.6));
    let d = 16;
    for (let it = 0; it < 12; it++) {
      cam.position.copy(home.t).addScaledVector(dir, d); cam.lookAt(home.t); cam.updateMatrixWorld();
      let x0 = 1, x1 = -1, y0 = 1, y1 = -1;
      for (const p of ring) { v.copy(p).project(cam); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
      d *= Math.max((x1 - x0) / 1.94, (y1 - y0) / 1.9);
      home.t.z += (y0 + y1) / 2 * -1.2;            // tahtayı dikeyde ortala
      home.t.z = Math.max(-1, Math.min(1.5, home.t.z));
    }
    home.d = d;
  }
  const tmp = new THREE.Vector3(), look = new THREE.Vector3();
  renderer.setAnimationLoop(now => {
    if (!el.isConnected || document.hidden) return;
    const w = el.clientWidth, h = el.clientHeight;
    if (w !== lw || h !== lh) { lw = w; lh = h; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); fit(); }
    for (const tw of [...tweens]) tw(now);
    const t = now / 1000, sway = calm ? 0 : Math.sin(t * .23) * .14;
    look.copy(home.t).lerp(tmp.set(focusAt.x * .55, 0, focusAt.z * .55), focus);
    camera.position.copy(look).add(tmp.copy(dir).multiplyScalar(home.d * (1 - .2 * focus)).applyAxisAngle(THREE.Object3D.DEFAULT_UP, sway));
    camera.lookAt(look);
    cup.rotation.y = t * .5;
    if (turn >= 0 && pawns[turn] && !busy) {        // sırası gelen takımın piyonu hafifçe zıplar, altında halka yanıp söner
      const g = pawns[turn];
      g.position.y = spot(shown[turn], turn).y + Math.abs(Math.sin(t * 3)) * .08;
      turnRing.visible = true; turnRing.material.color.set(colors[turn]);
      turnRing.position.set(g.position.x, TOP + .01, g.position.z);
      turnRing.scale.setScalar(.26 + .05 * Math.sin(t * 4)); turnRing.material.opacity = .55 + .35 * Math.sin(t * 4);
    } else turnRing.visible = false;
    renderer.render(scene, camera);
  });
  return { el, update };
}

window.Board = { create, icon };
