// Sarmal — oyun kuralları. Saf kod: tarayıcı (tek telefon) ve sunucu (çok telefon) aynı dosyayı kullanır.
// Lobi: newLobby / lobbyAct / fromLobby. Oyun: act(G, m, now, who) hata metni ya da undefined döner; view(G, who) ekrana gidecek hâl.
// who: null = tek telefon (her şeye yetkili), { id, host } = çok telefonda o oyuncu.
(function () {
  'use strict';
  const BASE = 60, N = 40, PASSES = 3, WORDS = 15, MAX_TEAMS = 6;
  const MODES = {   // mult: süre çarpanı, opts: kartta kaç seçenek
    anlat: { name: 'Anlat', icon: '💬', mult: 1, opts: 1 },
    ciz: { name: 'Çiz', icon: '✏️', mult: 1, opts: 3 },
    limit: { name: '15 Kelime', icon: '🔢', mult: 2, opts: 3 },
    mime: { name: 'Pandomim', icon: '🕺', mult: 1, opts: 3 },
  };
  const TEAMS = [['Kırmızı', '#ef4444'], ['Mavi', '#3b82f6'], ['Yeşil', '#22c55e'], ['Sarı', '#eab308'], ['Mor', '#a855f7'], ['Turuncu', '#f97316']];
  const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
  function shuffle(a, rnd = Math.random) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // ---------- lobi ----------
  const newLobby = () => ({ players: [], teams: TEAMS.slice(0, 2).map(([name, color]) => ({ name, color })), modes: Object.keys(MODES), next: 1 });

  function lobbyAct(L, m) {
    const p = L.players.find(p => p.id === m.pid);
    switch (m.a) {
      case 'add': {
        const name = clean(m.name, 16);
        if (!name) return 'Bir isim yaz';
        if (L.players.length >= 30) return 'En fazla 30 oyuncu';
        L.players.push({ id: L.next++, name, team: -1 });
        return;
      }
      case 'rm':
        if (!p) return 'Böyle bir oyuncu yok';
        L.players.splice(L.players.indexOf(p), 1);
        return;
      case 'team+':
        if (L.teams.length >= MAX_TEAMS) return `En fazla ${MAX_TEAMS} takım`;
        L.teams.push({ name: TEAMS[L.teams.length][0], color: TEAMS[L.teams.length][1] });
        return;
      case 'team-':
        if (L.teams.length <= 2) return 'En az 2 takım gerekli';
        L.teams.pop();
        for (const q of L.players) if (q.team >= L.teams.length) q.team = -1;
        return;
      case 'assign':   // team -1 = takımsız (havuz)
        if (!p) return 'Böyle bir oyuncu yok';
        if (!Number.isInteger(m.team) || m.team < -1 || m.team >= L.teams.length) return 'Geçersiz takım';
        p.team = m.team;
        return;
      case 'modes':
        if (!Array.isArray(m.list) || !m.list.length || m.list.some(k => !MODES[k])) return 'En az bir mod seç';
        L.modes = Object.keys(MODES).filter(k => m.list.includes(k));
        return;
    }
    return 'Bilinmeyen hamle';
  }

  function fromLobby(L, deck, rnd) {   // geçersizse Error fırlatır (mesajı oyuncuya gösterilir)
    const teams = L.teams.map((t, i) => ({ ...t, players: L.players.filter(p => p.team === i).map(({ id, name }) => ({ id, name })) }));
    if (teams.some(t => t.players.length < 2)) throw new Error('Her takımda en az 2 oyuncu olmalı');
    if (!deck || deck.length < 3) throw new Error('Kelimeler henüz yüklenmedi');
    return newGame({ teams, modes: L.modes, deck }, rnd);
  }

  // ---------- oyun ----------
  function newGame({ teams, modes, deck }, rnd = Math.random) {
    const board = [];   // seçilen modlar her turda karışık sırayla tekrar eder; seçilmeyen mod haritaya hiç girmez
    while (board.length < N) board.push(...shuffle([...modes], rnd));
    board.length = N;
    return {
      id: (Date.now() + Math.random()).toString(36),
      teams: teams.map(t => ({ name: t.name, color: t.color, players: t.players, pos: 0, next: 0 })),
      board, deck: shuffle([...deck], rnd), di: 0, turn: 0, phase: 'ready', cur: null, last: null, winner: -1,
    };
  }

  function draw(G, k) {   // deste biterse kullanılmış kartlar karılıp baştan dağıtılır
    if (G.di + k > G.deck.length) { shuffle(G.deck); G.di = 0; }
    return G.deck.slice(G.di, G.di += k);
  }

  function role(G, who) {
    if (!who) return 'all';
    const T = G.teams[G.turn];
    if (T.players[T.next].id === who.id) return 'describer';
    return T.players.some(p => p.id === who.id) ? 'mate' : 'rival';
  }

  function finish(G) {
    const T = G.teams[G.turn], c = G.cur, from = T.pos, net = c.ok - c.tabu;
    T.pos = Math.max(0, Math.min(N, from + net));
    G.last = { team: G.turn, mode: c.mode, ok: c.ok, pass: c.pass, tabu: c.tabu, net, from, to: T.pos };
    T.next = (T.next + 1) % T.players.length;
    G.cur = null;
    if (T.pos === N) { G.phase = 'over'; G.winner = G.turn; return; }
    G.phase = 'ready';
    G.turn = (G.turn + 1) % G.teams.length;
  }
  const endTurn = G => { if (G.cur.mode === 'ciz') G.phase = 'score'; else finish(G); };   // çizimde puan süre bitince sorulur

  function act(G, m, now, who) {
    const T = G.teams[G.turn], c = G.cur, r = role(G, who);
    const lead = r === 'all' || r === 'describer', boss = lead || !!(who && who.host);
    if (m.n !== undefined && (!c || m.n !== c.n)) return 'Kart değişti';   // geç kalmış ya da çift dokunuş: o kart çoktan gitti
    switch (m.a) {
      case 'start': {
        if (G.phase !== 'ready') return 'Tur şu an başlatılamaz';
        if (!boss) return 'Turu anlatan başlatır';
        const mode = G.board[T.pos];
        G.cur = { mode, endsAt: now + BASE * MODES[mode].mult * 1000, ok: 0, pass: 0, tabu: 0, words: 0, n: 0, card: draw(G, MODES[mode].opts) };
        G.phase = 'play';
        return;
      }
      case 'timeup':
        if (G.phase !== 'play') return 'Tur oynanmıyor';
        if (now < c.endsAt - 300) return 'Süre bitmedi';
        return endTurn(G);
      case 'score': {
        if (G.phase !== 'score') return 'Şu an puan girilmiyor';
        if (!boss) return 'Sonucu çizen girer';
        const ok = Number(m.ok), ceza = Number(m.ceza);
        if (![ok, ceza].every(x => Number.isInteger(x) && x >= 0 && x <= 99)) return 'Geçersiz sayı';
        c.ok = ok; c.tabu = ceza;
        return finish(G);
      }
    }
    if (G.phase !== 'play') return 'Tur oynanmıyor';
    const ciz = c.mode === 'ciz', limit = c.mode === 'limit';
    const card = () => { c.card = draw(G, MODES[c.mode].opts); c.n++; };
    switch (m.a) {
      case 'ok':
        if (!lead || ciz) return 'Doğruya anlatan basar';
        c.ok++; card();
        return;
      case 'pass':
        if (!lead || ciz) return 'Pasa anlatan basar';
        if (limit) {   // 15 Kelime: pas sınırsız ama her pas bir kelime hakkı yer
          c.pass++; c.words++;
          if (c.words >= WORDS) return endTurn(G);
        } else {
          if (c.pass >= PASSES) return 'Pas hakkın bitti';
          c.pass++;
        }
        card();
        return;
      case 'tabu':
        if (ciz || r === 'mate') return 'Tabuya rakip takım basar';
        c.tabu++; card();
        return;
      case 'word':
        if (!limit || r === 'mate') return 'Kelimeleri rakip takım sayar';
        c.words++;
        if (c.words >= WORDS) return endTurn(G);
        return;
      case 'next':
        if (!lead || !ciz) return 'Kartı çizen değiştirir';
        card();
        return;
    }
    return 'Bilinmeyen hamle';
  }

  function view(G, who) {
    const r = role(G, who), T = G.teams[G.turn], c = G.cur;
    return {
      id: G.id, phase: G.phase, turn: G.turn, board: G.board, winner: G.winner, last: G.last, role: r, host: !!(who && who.host),
      teams: G.teams.map(t => ({ name: t.name, color: t.color, pos: t.pos, players: t.players.map(p => p.name), next: t.next })),
      describer: T.players[T.next].name,
      mode: c ? c.mode : G.board[Math.min(T.pos, N - 1)],
      cur: c && { endsAt: c.endsAt, ok: c.ok, pass: c.pass, tabu: c.tabu, words: c.words, n: c.n },
      card: c && G.phase === 'play' && r !== 'mate' ? c.card : null,   // anlatanın takım arkadaşları kartı görmez
    };
  }

  const Game = { BASE, N, PASSES, WORDS, MODES, TEAMS, shuffle, newLobby, lobbyAct, fromLobby, newGame, act, view };
  if (typeof module !== 'undefined') module.exports = Game; else window.Game = Game;
})();
