// Sarmal — sayfa: ana ekran, lobi (takımlara sürükle), harita, tur ekranı.
// Tek telefonda kurallar (game.js) burada çalışır; çok telefonda sunucuda çalışır ve buraya yalnızca görünüm gelir.
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  function h(tag, props, ...kids) {
    const e = document.createElement(tag);
    for (const k in props || {}) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k.startsWith('on')) e[k] = v;
      else if (k === 'class') e.className = v;
      else if (k === 'style') e.style.cssText = v;
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : String(c));
    return e;
  }
  const up = s => String(s).toLocaleUpperCase('tr');
  const M = Game.MODES, secs = k => Game.BASE * M[k].mult;
  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const store = {
    get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* gizli sekme ya da dolu: kaydedilmez */ } },
  };
  const RULE = {
    anlat: 'Kelimeyi yasaklı kelimeleri söylemeden anlat. Doğru +1, tabu −1, 3 pas hakkı.',
    ciz: 'Üç seçenekten birini kağıda çiz. Harf, rakam, sembol ve konuşmak yok. Süre bitince kaç doğru olduğunu gir.',
    limit: 'Üç seçenekten birini anlat. Turda toplam 15 kelime hakkın var; pas sınırsız ama her pas 1 kelime yer.',
    mime: 'Üç seçenekten birini konuşmadan, sadece vücudunla anlat. Ses çıkarmak tabu. 3 pas hakkı.',
  };
  const ROLE = {
    all: () => '📱 Telefonu anlatana verin. Rakip takımdan biri ekrana göz kulak olsun.',
    describer: () => 'Hazır olunca başla. Kartı sen ve rakip takım göreceksiniz.',
    mate: () => 'Tahmin eden sensin! Kartı göremezsin.',
    rival: V => V.mode === 'limit' ? 'Kartı göreceksin. Anlatanın her kelimesinde "+1 kelime"ye, kural ihlalinde TABU\'ya bas.'
      : V.mode === 'ciz' ? 'Kartı göreceksin. Harf ya da sembol çizilirse süre sonunda ceza yazılır.'
      : 'Kartı göreceksin. Yasaklı kelime söylenirse TABU\'ya bas.',
  };

  // kimlik: tarayıcı başına gizli bir anahtar; adrese #2 gibi bir ek koyunca aynı tarayıcıda ikinci oyuncu olunur
  let token = store.get('sarmal-kimlik' + location.hash);
  if (!/^[a-f0-9]{32}$/.test(token || '')) {
    token = [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
    store.set('sarmal-kimlik' + location.hash, token);
  }

  // ---------- durum ----------
  let ui = store.get('sarmal-ekran') === 'local' ? 'local' : 'home';   // home | local | net
  let words = YEDEK, server = false, S = null, offset = 0, online = true;
  let local = store.get('sarmal-yerel');                                // tek telefon: { L: lobi, G: oyun }, her hamleden sonra kaydedilir
  if (!local || !local.L) local = { L: Game.newLobby(), G: null };
  let name = store.get('sarmal-isim') || '';
  let code = (new URLSearchParams(location.search).get('oda') || '').toUpperCase();
  let pick = null, dragEnd = 0, draft = null, lastTick = 0, was = null;
  const board = Board.create();

  function here() {   // ekrandaki oyun: lobi, oyun görünümü, düzenleme yetkisi
    if (ui === 'local') return { L: local.L, V: local.G && Game.view(local.G, null), edit: true, local: true, me: null };
    if (ui === 'net' && S && S.room) return { L: S.lobby, V: S.game, edit: S.host, local: false, me: S.me };
    return null;
  }
  function go(to) { ui = to; pick = null; store.set('sarmal-ekran', ui === 'local' ? 'local' : 'home'); render(); }
  function say(text) {
    const t = $('#toast');
    t.textContent = text; t.classList.add('on');
    clearTimeout(say.t); say.t = setTimeout(() => t.classList.remove('on'), 2600);
  }

  async function send(m) {
    if (ui === 'local') return play(m);
    try {
      const r = await fetch('act', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...m, t: token }) });
      const { err } = await r.json();
      if (err) { say(err); render(); }   // reddedilen dokunuşun bıraktığı izi (ör. kutucuk) geri al
    } catch (e) { say('Sunucuya ulaşılamadı'); }
  }
  function play(m) {
    let err;
    if (m.a === 'begin') { try { local.G = Game.fromLobby(local.L, words); } catch (e) { err = e.message; } }
    else if (m.a === 'lobby') local.G = null;
    else if (local.G) err = Game.act(local.G, m, Date.now(), null);
    else err = Game.lobbyAct(local.L, m);
    if (err) say(err);
    store.set('sarmal-yerel', local);
    render();
  }

  function connect() {
    const es = new EventSource('events?t=' + token);
    es.onerror = () => { if (online) { online = false; render(); } };
    es.onmessage = e => {
      S = JSON.parse(e.data); offset = S.now - Date.now(); online = true;
      if (S.room && ui === 'home') ui = 'net';
      if (!S.room && ui === 'net') ui = 'home';
      if (ui !== 'local') render();
    };
  }

  // ---------- ekranlar ----------
  function render() {
    const C = here(), V = C && C.V;
    if (was && V && was.id === V.id && was.phase === 'play' && V.phase !== 'play') sfx('end');   // tur bitti: dııııt
    was = V && { id: V.id, phase: V.phase };
    if (!V || V.phase !== 'score') draft = null;
    $('#quit').hidden = !C;
    $('#mute').textContent = isMuted() ? '🔇' : '🔊';
    const kind = !C ? 'home' : !V ? 'lobby' : V.phase === 'play' ? 'turn' : V.phase === 'score' ? 'score' : 'map';
    const screen = { home, lobby, turn, score, map }[kind](C, V);
    const warn = C && !C.local && !online ? h('p', { class: 'warn' }, 'Sunucuyla bağlantı koptu, yeniden bağlanıyor…') : null;
    $('#app').replaceChildren(...[warn, screen].filter(Boolean));
    if (kind !== render.kind) { scrollTo(0, 0); render.kind = kind; }   // yeni ekran baştan görünsün
    if (V) board.update(V);   // tur sırasında da: sayfa yenilense bile tur sonu ilerlemesi animasyonlu olur
    tick();
  }

  function logo() {
    const pts = Board.points(70).slice(0, -1), d = 'M' + pts.map(p => p.map(v => v.toFixed(1)).join(' ')).join(' L');
    const w = h('div', { class: 'logo-art', 'aria-hidden': 'true' });
    w.innerHTML = `<svg viewBox="-200 -200 400 400"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbbf24"/><stop offset=".5" stop-color="#c084fc"/><stop offset="1" stop-color="#38bdf8"/></linearGradient></defs>
      <path d="${d}" fill="none" stroke="url(#lg)" stroke-width="24" stroke-linecap="round"/>
      ${[0, 17, 34, 51].map((i, k) => `<circle cx="${pts[i][0]}" cy="${pts[i][1]}" r="20" fill="${['#f59e0b', '#38bdf8', '#c084fc', '#4ade80'][k]}" stroke="#15112b" stroke-width="5"/>`).join('')}</svg>`;
    return w;
  }

  function home() {
    const nameIn = h('input', { value: name, maxlength: 16, placeholder: 'İsmin', autocomplete: 'off', 'aria-label': 'İsmin', oninput: e => { name = e.target.value; store.set('sarmal-isim', name); } });
    const codeIn = h('input', { value: code, maxlength: 4, placeholder: 'KOD', class: 'code-in', autocomplete: 'off', autocapitalize: 'characters', 'aria-label': 'Oda kodu', oninput: e => { code = e.target.value.toUpperCase(); } });
    const fresh = () => {
      if (local.G && !confirm('Yarım kalan tek telefon oyunu silinsin mi?')) return;
      local.G = null; store.set('sarmal-yerel', local); go('local');
    };
    return h('section', { class: 'home' },
      h('div', { class: 'hero' }, logo(), h('h1', {}, 'Sarmal'), h('p', { class: 'tag' }, 'Anlat · Çiz · 15 Kelime · Pandomim')),
      S && S.room ? h('button', { class: 'btn primary', onclick: () => go('net') }, `Odana dön (${S.room})`) : null,
      local.G ? h('button', { class: 'btn primary', onclick: () => go('local') }, 'Tek telefon oyununa devam et') : null,
      h('div', { class: 'panel' },
        h('h2', {}, '📱 Tek telefon'),
        h('p', { class: 'muted' }, 'İsimleri gir, takımlara ayır; telefon elden ele dolaşsın.'),
        h('button', { class: 'btn' + (local.G ? '' : ' primary'), onclick: fresh }, local.G ? 'Yeni oyun kur' : 'Oyunu kur')),
      h('div', { class: 'panel' },
        h('h2', {}, '📲 Herkes kendi telefonundan'),
        server ? [
          h('p', { class: 'muted' }, 'Aynı Wi-Fi\'de olun. Biri oda kursun, diğerleri kodla girsin.'),
          nameIn,
          h('button', { class: 'btn', onclick: () => send({ a: 'create', name }) }, 'Oda kur'),
          h('div', { class: 'row' }, codeIn, h('button', { class: 'btn', onclick: () => send({ a: 'join', room: code, name }) }, 'Odaya katıl')),
        ] : h('p', { class: 'muted' }, 'Bunun için oyunu bilgisayarda açılan sunucudan aç (node server.js). Sunucu yokken yalnızca tek telefonla oynanır.')),
      h('button', { class: 'link', onclick: () => $('#help').showModal() }, 'Nasıl oynanır?'),
      h('p', { class: 'muted small center' }, `${words.length.toLocaleString('tr')} kelime kartı`));
  }

  function lobby(C) {
    const { L, edit } = C;
    const assign = (pid, team) => { pick = null; send({ a: 'assign', pid, team }); };
    const chip = p => {
      const t = L.teams[p.team], mine = p.id === C.me;
      return h('div', {
        class: 'chip' + (edit ? ' drag' : '') + (pick === p.id ? ' picked' : '') + (mine ? ' me' : '') + (p.on === false ? ' off' : ''),
        style: t ? `--c:${t.color}` : null, tabindex: edit ? 0 : null, role: edit ? 'button' : null, 'aria-pressed': edit ? String(pick === p.id) : null,
        onpointerdown: edit ? e => drag(e, p.id) : null,
        onclick: edit ? e => { e.stopPropagation(); if (Date.now() - dragEnd < 350) return; pick = pick === p.id ? null : p.id; render(); } : null,
        onkeydown: edit ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick = pick === p.id ? null : p.id; render(); } } : null,
      },
      p.name + (mine ? ' (sen)' : ''),
      edit && !mine ? h('button', { class: 'x', type: 'button', 'aria-label': p.name + ' çıkar', onclick: e => { e.stopPropagation(); if (C.local || confirm(p.name + ' odadan çıkarılsın mı?')) send({ a: 'rm', pid: p.id }); } }, '×') : null);
    };
    const zone = (i, title, color) => {
      const list = L.players.filter(p => p.team === i);
      return h('div', {
        class: 'zone' + (i < 0 ? ' pool' : ''), 'data-team': i, style: color ? `--c:${color}` : null,
        onclick: edit && pick != null ? () => { if (Date.now() - dragEnd > 350) assign(pick, i); } : null,
      },
      h('div', { class: 'zhead' }, h('b', {}, title), h('span', { class: 'n' }, list.length),
        edit && pick != null ? h('button', { class: 'mini', type: 'button', onclick: e => { e.stopPropagation(); assign(pick, i); } }, 'Buraya') : null),
      h('div', { class: 'chips' }, list.length ? list.map(chip) : h('span', { class: 'empty' }, i < 0 ? (L.players.length ? 'Herkes bir takımda' : 'Henüz kimse yok') : 'Buraya sürükle')));
    };
    let head;
    if (C.local) {
      const addIn = h('input', { id: 'addname', maxlength: 16, placeholder: 'Oyuncu ismi', 'aria-label': 'Oyuncu ismi', autocomplete: 'off', enterkeyhint: 'done' });
      head = [h('h2', {}, 'Tek telefon'),
        h('form', { class: 'row add', onsubmit: e => { e.preventDefault(); if (!addIn.value.trim()) return; send({ a: 'add', name: addIn.value }); const i = $('#addname'); if (i) i.focus(); } },
          addIn, h('button', { class: 'btn' }, 'Ekle'))];
    } else {
      const lan = /^(localhost|127\.|\[::1\])/.test(location.host) && S.urls.length;   // bilgisayarda açıldıysa ağ adresini göster
      const base = lan ? S.urls[0] : location.origin;
      head = h('div', { class: 'roomcode' }, h('span', {}, 'Oda kodu'), h('b', {}, S.room),
        h('small', {}, 'Diğer telefonlar aynı Wi-Fi\'de bu adrese girsin:'), h('code', {}, `${base}/?oda=${S.room}`),
        lan && S.urls.length > 1 ? h('details', {}, h('summary', {}, 'Açılmazsa diğer adresler'), S.urls.slice(1).map(u => h('code', {}, `${u}/?oda=${S.room}`))) : null);
    }
    return h('section', { class: 'lobby' },
      head,
      h('p', { class: 'hint' }, edit ? 'Oyuncuları takımlara sürükle ya da oyuncuya dokunup takıma dokun.' : 'Kurucu takımları ayarlıyor…'),
      zone(-1, 'Takımsız'),
      h('div', { class: 'teams' }, L.teams.map((t, i) => zone(i, t.name, t.color))),
      edit ? h('div', { class: 'row' },
        h('button', { class: 'btn ghost', disabled: L.teams.length <= 2, onclick: () => send({ a: 'team-' }) }, '− Takım'),
        h('button', { class: 'btn ghost', disabled: L.teams.length >= 6, onclick: () => send({ a: 'team+' }) }, '+ Takım')) : null,
      h('h3', {}, 'Modlar'),
      h('div', { class: 'modes' }, Object.keys(M).map(k => h('label', { class: 'mopt m-' + k },
        h('input', { type: 'checkbox', checked: L.modes.includes(k), disabled: !edit, onchange: e => send({ a: 'modes', list: e.target.checked ? [...L.modes, k] : L.modes.filter(x => x !== k) }) }),
        h('span', { class: 'mi' }, M[k].icon), h('span', {}, h('b', {}, M[k].name), h('small', {}, `${secs(k)} sn`))))),
      edit ? h('button', { class: 'btn primary big', onclick: () => send({ a: 'begin' }) }, 'Oyunu başlat')
        : h('p', { class: 'muted center' }, 'Kurucu başlatınca oyun burada açılacak.'));
  }

  function drag(e, pid) {   // parmakla sürükle; kımıldamadan bırakılırsa dokunma sayılır (onclick seçer)
    if (e.button > 0 || e.target.closest('.x')) return;
    const chip = e.currentTarget, sx = e.clientX, sy = e.clientY;
    let ghost = null;
    const zoneAt = ev => { const z = document.elementFromPoint(ev.clientX, ev.clientY); return z && z.closest('.zone'); };
    const move = ev => {
      if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 8) return;
      if (!ghost) { ghost = chip.cloneNode(true); ghost.classList.add('ghost'); document.body.append(ghost); chip.classList.add('lifted'); }
      ghost.style.transform = `translate(${ev.clientX}px, ${ev.clientY}px) translate(-50%, -70%) rotate(-4deg)`;
      const z = zoneAt(ev);
      document.querySelectorAll('.zone').forEach(x => x.classList.toggle('over', x === z));
    };
    const end = ev => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', end); removeEventListener('pointercancel', end);
      if (!ghost) return;
      dragEnd = Date.now();
      ghost.remove(); chip.classList.remove('lifted');
      document.querySelectorAll('.zone.over').forEach(x => x.classList.remove('over'));
      const z = ev.type === 'pointerup' && zoneAt(ev);
      pick = null;
      if (z) send({ a: 'assign', pid, team: +z.dataset.team }); else render();
    };
    addEventListener('pointermove', move); addEventListener('pointerup', end); addEventListener('pointercancel', end);
  }

  function map(C, V) {
    const T = V.teams[V.turn], boss = C.local || V.role === 'describer' || V.host, last = V.last, LT = last && V.teams[last.team];
    return h('section', { class: 'mapscreen' },
      last ? h('div', { class: 'last', style: `--c:${LT.color}` },
        h('b', {}, LT.name), ` ${M[last.mode].icon}  ✓${last.ok}  pas ${last.pass}  ✗${last.tabu}  →  `,
        h('b', {}, last.net === 0 ? 'yerinde kaldı' : `${last.net > 0 ? '+' : ''}${last.net} kare`)) : null,
      h('div', { class: 'boardwrap' }, board.svg),
      V.phase === 'over'
        ? h('div', { class: 'next win', style: `--c:${V.teams[V.winner].color}` },
          h('div', { class: 'trophy' }, '🏆'), h('div', { class: 'big' }, `${V.teams[V.winner].name} kazandı!`),
          C.edit ? h('button', { class: 'btn primary big', onclick: () => send({ a: 'lobby' }) }, 'Yeni oyun') : null)
        : h('div', { class: 'next', style: `--c:${T.color}` },
          h('div', { class: 'who' }, `Sıra ${T.name} takımında`),
          h('div', { class: 'big' }, `${V.describer} anlatıyor`),
          h('div', { class: 'mchip m-' + V.mode }, `${M[V.mode].icon} ${M[V.mode].name} · ${secs(V.mode)} sn`),
          h('p', { class: 'rule' }, RULE[V.mode]),
          h('p', { class: 'role' }, ROLE[V.role](V)),
          boss ? h('button', { class: 'btn go big', onclick: () => send({ a: 'start' }) }, 'Başla') : h('p', { class: 'muted center' }, `${V.describer} başlatacak`)),
      h('ol', { class: 'standings' }, V.teams.map((t, i) => h('li', { style: `--c:${t.color}`, class: i === V.turn && V.phase === 'ready' ? 'now' : null },
        h('i', { class: 'dot' }), h('b', {}, t.name), h('span', { class: 'pl' }, t.players.join(', ')), h('span', { class: 'pos' }, `${t.pos}/${Game.N}`)))),
      h('div', { class: 'legend' }, [...new Set(V.board)].map(k => h('span', { class: 'lg m-' + k }, `${M[k].icon} ${M[k].name}`))));
  }

  function turn(C, V) {
    const T = V.teams[V.turn], c = V.cur, mode = V.mode, n = c.n;
    const lead = V.role === 'all' || V.role === 'describer', rival = V.role === 'rival';
    const b = (cls, label, m, off) => h('button', { class: 'act ' + cls, disabled: !!off, onclick: () => send(m) }, label);
    let card;
    if (!V.card) card = h('div', { class: 'card guess' }, h('div', { class: 'big' }, 'Tahmin et!'), h('p', {}, `${V.describer} anlatıyor`));
    else if (mode === 'anlat') card = h('div', { class: 'card m-anlat' }, h('div', { class: 'word' }, up(V.card[0].w)), h('ul', { class: 'taboo' }, V.card[0].t.map(x => h('li', {}, up(x)))));
    else card = h('div', { class: 'card opts m-' + mode },
      h('p', { class: 'hint' }, mode === 'ciz' ? 'Birini kağıda çiz' : mode === 'mime' ? 'Birini konuşmadan anlat' : 'Birini anlat'),
      V.card.map(x => h('div', { class: 'opt' }, up(x.w))));
    const passLeft = Game.PASSES - c.pass, word = b('word', '+1 kelime', { a: 'word' });
    let acts = null;
    if (lead) acts = mode === 'ciz' ? [b('next wide', 'Sonraki kart →', { a: 'next', n })] : [
      mode === 'limit' ? word : null,
      b('pass', mode === 'limit' ? 'Pas −1 kelime' : `Pas (${passLeft})`, { a: 'pass', n }, mode !== 'limit' && passLeft <= 0),
      b('tabu', 'Tabu', { a: 'tabu', n }),
      b('ok', 'Doğru', { a: 'ok', n })];
    else if (rival && mode !== 'ciz') acts = [mode === 'limit' ? word : null, b('tabu wide', 'TABU!', { a: 'tabu', n })];
    return h('section', { class: 'turn', style: `--c:${T.color}` },
      h('div', { class: 'thead' }, h('span', { class: 'tname' }, h('i', { class: 'dot' }), `${T.name} · ${V.describer}`), h('span', { class: 'mchip m-' + mode }, `${M[mode].icon} ${M[mode].name}`)),
      h('div', { class: 'clock' }, h('div', { id: 'timer', class: 'timer' }), h('div', { class: 'bar' }, h('i', { id: 'bar' }))),
      mode === 'ciz' ? null : h('div', { class: 'stats' },
        h('span', { class: 's-ok' }, `✓ ${c.ok}`), h('span', {}, `pas ${c.pass}`), h('span', { class: 's-tabu' }, `✗ ${c.tabu}`),
        mode === 'limit' ? h('span', { class: 's-words' }, `kalan kelime ${Game.WORDS - c.words}`) : null),
      card,
      acts ? h('div', { class: 'acts' }, acts)
        : h('p', { class: 'muted center' }, V.role === 'mate' ? 'Bildiğini yüksek sesle söyle!' : 'Çizimi izleyin; süre bitince sonuç girilecek.'));
  }

  function score(C, V) {
    const T = V.teams[V.turn];
    if (!(C.local || V.role === 'describer' || V.host)) return h('section', { class: 'turn', style: `--c:${T.color}` },
      h('div', { class: 'card guess' }, h('div', { class: 'big' }, 'Süre bitti!'), h('p', {}, `${V.describer} sonucu giriyor…`)));
    draft = draft || { ok: 0, ceza: 0 };
    const set = (k, d) => { draft[k] = Math.max(0, Math.min(99, draft[k] + d)); render(); };
    const step = (k, label) => h('div', { class: 'stepper' }, h('span', {}, label),
      h('button', { class: 'sbtn', 'aria-label': label + ' azalt', onclick: () => set(k, -1) }, '−'),
      h('b', { 'aria-live': 'polite' }, draft[k]),
      h('button', { class: 'sbtn', 'aria-label': label + ' artır', onclick: () => set(k, 1) }, '+'));
    const net = draft.ok - draft.ceza;
    return h('section', { class: 'turn', style: `--c:${T.color}` },
      h('h2', { class: 'center' }, '⏰ Süre bitti!'),
      h('p', { class: 'center muted' }, `${T.name} kaç çizimi bildi?`),
      step('ok', 'Doğru'), step('ceza', 'Ceza'),
      h('p', { class: 'center muted small' }, 'Ceza: harf, rakam ya da sembol çizmek, konuşmak.'),
      h('p', { class: 'center' }, net === 0 ? 'Piyon yerinde kalır' : `Piyon ${net > 0 ? '+' : ''}${net} kare gider`),
      h('button', { class: 'btn primary big', onclick: () => send({ a: 'score', ok: draft.ok, ceza: draft.ceza }) }, 'Kaydet'));
  }

  // ---------- süre ----------
  function tick() {
    const C = here(), V = C && C.V;
    if (!V || V.phase !== 'play') return;
    const left = (V.cur.endsAt - Date.now() - (C.local ? 0 : offset)) / 1000, s = Math.max(0, Math.ceil(left));
    const t = $('#timer'), bar = $('#bar');
    if (t) { t.textContent = fmt(s); t.classList.toggle('hot', s <= 5); }
    if (bar) bar.style.width = Math.max(0, 100 * left / secs(V.mode)) + '%';
    if (s > 5) lastTick = 0;
    else if (s >= 1 && s !== lastTick) { lastTick = s; sfx(s % 2 ? 'tick' : 'tock'); }   // son 5 saniye: tik-tak
    if (C.local && left <= 0) play({ a: 'timeup' });
  }
  setInterval(tick, 100);

  // ---------- üst düğmeler ----------
  $('#mute').onclick = () => { toggleMute(); render(); };
  $('#helpbtn').onclick = () => $('#help').showModal();
  $('#quit').onclick = () => {
    const C = here();
    if (!C) return;
    if (C.local) {
      if (!C.V) return go('home');
      if (confirm('Oyun bitirilip lobiye dönülsün mü?')) play({ a: 'lobby' });
    } else if (C.V && C.edit) {
      if (confirm('Oyun herkes için bitirilip lobiye dönülsün mü?')) send({ a: 'lobby' });
    } else if (confirm('Odadan çıkılsın mı?')) send({ a: 'leave' });
  };

  // ---------- açılış: sunucu var mı, kelimeler nereden ----------
  render();
  (async () => {
    try {
      const r = await fetch('kelimeler.json', { cache: 'no-store' });
      if (r.ok) { const list = await r.json(); server = true; if (Array.isArray(list) && list.length) words = list; }
    } catch (e) { /* dosyadan açıldı: sunucu yok */ }
    if (server) connect();
    else Words.load(u => fetch(u)).then(list => { if (list.length > words.length) { words = list; if (!here()) render(); } }).catch(() => {});
    render();
  })();
})();
