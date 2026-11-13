'use strict';
// Kural testleri. Çalıştır: node test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const Game = require('./public/game');
const Words = require('./public/words');
const YEDEK = require('./public/yedek');

const deck = Array.from({ length: 20 }, (_, i) => ({ w: 'K' + i, t: ['a', 'b', 'c'] }));
function lobby(teams = 2, per = 2, modes) {
  const L = Game.newLobby();
  while (L.teams.length < teams) Game.lobbyAct(L, { a: 'team+' });
  for (let t = 0; t < teams; t++) for (let k = 0; k < per; k++) {
    Game.lobbyAct(L, { a: 'add', name: `T${t}P${k}` });
    Game.lobbyAct(L, { a: 'assign', pid: L.players.at(-1).id, team: t });
  }
  if (modes) Game.lobbyAct(L, { a: 'modes', list: modes });
  return L;
}
const mk = (...a) => Game.fromLobby(lobby(...a), deck);
const ok = (G, m, now = 0, who = null) => assert.equal(Game.act(G, m, now, who), undefined, 'reddedildi: ' + JSON.stringify(m));
const no = (G, m, now = 0, who = null) => assert.equal(typeof Game.act(G, m, now, who), 'string', 'kabul edildi: ' + JSON.stringify(m));
function start(G, mode, now = 0) { G.board[G.teams[G.turn].pos] = mode; ok(G, { a: 'start' }, now); }

test('kelimeler: aynı kelime bir kez, en çok 5 yasaklı, 3ten az yasaklı kart atılır', () => {
  const out = Words.merge([
    [['Kedi', ['Miyav', 'Pati', 'Tüy', 'Süt', 'Fare', 'Bıyık']], ['Ev', ['Çatı', 'Kapı']]],
    [['KEDİ', ['x', 'y', 'z']], ['  Çay ', ['Demlik', 'çay', 'Bardak', 'Şeker']]],
  ]);
  assert.deepEqual(out, [{ w: 'Kedi', t: ['Miyav', 'Pati', 'Tüy', 'Süt', 'Fare'] }, { w: 'Çay', t: ['Demlik', 'Bardak', 'Şeker'] }]);
  assert.ok(YEDEK.length > 400 && YEDEK.every(c => c.w && c.t.length >= 3));
});

test('kelimeler: somut işareti birleşir, düz kelimeler yalnızca somut havuza girer', () => {
  const out = Words.merge([[['Kedi', ['Miyav', 'Pati', 'Tüy']]], [['KEDİ', ['a', 'b', 'c'], true]], ['Diş fırçalamak']]);
  assert.deepEqual(out, [{ w: 'Kedi', t: ['Miyav', 'Pati', 'Tüy'], s: 1 }, { w: 'Diş fırçalamak', t: [], s: 1 }]);
  assert.ok(require('./public/somut').length > 150);
});

test('lobi: takımda 2 kişiden az varsa oyun başlamaz; takım silinince oyuncular havuza döner', () => {
  const L = lobby(3, 2);
  L.players[0].team = -1;
  assert.throws(() => Game.fromLobby(L, deck), /en az 2 oyuncu/);
  Game.lobbyAct(L, { a: 'team-' });
  assert.ok(L.players.filter(p => p.team === -1).length === 3);
  assert.equal(Game.lobbyAct(L, { a: 'team-' }), 'En az 2 takım gerekli');
  assert.equal(Game.lobbyAct(L, { a: 'modes', list: [] }), 'En az bir mod seç');
});

test('harita yalnızca seçilen modlardan oluşur', () => {
  const G = mk(2, 2, ['anlat', 'mime']);
  assert.equal(G.board.length, Game.N);
  assert.deepEqual([...new Set(G.board)].sort(), ['anlat', 'mime']);
});

test('anlat: doğru +1, tabu -1, pas 0; 4. pas reddedilir; süre 60 sn', () => {
  const G = mk();
  start(G, 'anlat', 1000);
  assert.equal(G.cur.endsAt, 61000);
  assert.equal(G.cur.card.length, 1);
  ok(G, { a: 'ok' }); ok(G, { a: 'ok' }); ok(G, { a: 'tabu' });
  ok(G, { a: 'pass' }); ok(G, { a: 'pass' }); ok(G, { a: 'pass' });
  no(G, { a: 'pass' });
  no(G, { a: 'timeup' }, 50000);
  ok(G, { a: 'timeup' }, 61000);
  assert.deepEqual(G.last, { team: 0, mode: 'anlat', ok: 2, pass: 3, tabu: 1, net: 1, from: 0, to: 1 });
  assert.equal(G.turn, 1);
  assert.equal(G.phase, 'ready');
});

test('15 kelime: 120 sn, pas bir kelime yer; 15. kelimeden sonra tur sürer, son tahmin sayılır', () => {
  const G = mk();
  start(G, 'limit', 0);
  assert.equal(G.cur.endsAt, 120000);
  assert.equal(G.cur.card.length, 3);
  for (let i = 0; i < 5; i++) ok(G, { a: 'pass' });   // pas sınırı yok
  ok(G, { a: 'ok' });
  for (let i = 0; i < 10; i++) ok(G, { a: 'word' });
  assert.equal(G.cur.words, 15);
  assert.equal(G.phase, 'play');
  no(G, { a: 'word' }); no(G, { a: 'pass' });          // hak bitti: kelime ve pas yok
  ok(G, { a: 'ok' });                                   // son ipucundan sonra bildiler
  ok(G, { a: 'end' });
  assert.equal(G.phase, 'ready');
  assert.equal(G.last.ok, 2);
  assert.equal(G.teams[0].pos, 2);
});

test('bitir: anlatan ya da kurucu süreyi beklemeden bitirir; çizimde sonuç ekranına gider', () => {
  const G = mk();
  const [d, mate] = G.teams[0].players, rival = G.teams[1].players[0];
  G.board[0] = 'anlat';
  ok(G, { a: 'start' }, 0, { id: d.id });
  no(G, { a: 'end' }, 0, { id: mate.id });
  no(G, { a: 'end' }, 0, { id: rival.id });
  ok(G, { a: 'end' }, 0, { id: rival.id, host: true });
  assert.equal(G.phase, 'ready');
  start(G, 'ciz');
  ok(G, { a: 'ok' });
  ok(G, { a: 'end' });
  assert.equal(G.phase, 'score');
  no(G, { a: 'end' });
});

test('çiz: doğru sayılır, pas sınırsız, tabu yok; süre bitince sonuç onaylanır ve ceza eklenir', () => {
  const G = mk();
  start(G, 'ciz', 0);
  no(G, { a: 'tabu' });
  ok(G, { a: 'ok' }); ok(G, { a: 'ok' });
  for (let i = 0; i < 6; i++) ok(G, { a: 'pass' });
  ok(G, { a: 'timeup' }, 60000);
  assert.equal(G.phase, 'score');
  assert.equal(Game.view(G, null).cur.ok, 2);   // ekrana dolu gelir
  no(G, { a: 'score', ok: -1, ceza: 0 });
  ok(G, { a: 'score', ok: 4, ceza: 1 });
  assert.equal(G.teams[0].pos, 3);
  assert.equal(G.phase, 'ready');
});

test('ilk 3 kare Anlat, sonrası karışık; Anlat seçilmediyse hiç yok', () => {
  const G = mk(2, 2, ['anlat', 'ciz', 'mime']);
  assert.deepEqual(G.board.slice(0, 3), ['anlat', 'anlat', 'anlat']);
  assert.ok(G.board.slice(3).includes('ciz'));
  const H = mk(2, 2, ['ciz', 'mime']);
  assert.ok(!H.board.includes('anlat'));
});

test('çiz ve pandomim somut kelimelerden, anlat ve 15 kelime yasaklılı kartlardan seçer', () => {
  const somut = Array.from({ length: 40 }, (_, i) => ({ w: 'S' + i, t: [], s: 1 }));
  const G = Game.fromLobby(lobby(), [...deck, ...somut]);
  start(G, 'mime');
  assert.ok(G.cur.card.every(c => c.s));
  ok(G, { a: 'timeup' }, 60000);
  start(G, 'limit');
  assert.ok(G.cur.card.every(c => c.t.length >= 3));
});

test('piyon başlangıcın gerisine düşmez; merkeze varan kazanır', () => {
  const G = mk();
  start(G, 'anlat'); ok(G, { a: 'tabu' }); ok(G, { a: 'timeup' }, 60000);
  assert.equal(G.teams[0].pos, 0);
  G.teams[1].pos = Game.N - 1;
  start(G, 'anlat'); ok(G, { a: 'ok' }); ok(G, { a: 'ok' }); ok(G, { a: 'timeup' }, 60000);
  assert.equal(G.teams[1].pos, Game.N);
  assert.equal(G.phase, 'over');
  assert.equal(G.winner, 1);
});

test('anlatan takım içinde sırayla değişir', () => {
  const G = mk(2, 3);
  const names = [];
  for (let i = 0; i < 6; i++) { names.push(Game.view(G, null).describer); start(G, 'anlat'); ok(G, { a: 'timeup' }, 60000); }
  assert.deepEqual(names, ['T0P0', 'T1P0', 'T0P1', 'T1P1', 'T0P2', 'T1P2']);
});

test('çok telefon: takım arkadaşı kartı görmez, rakip görür ve yalnızca tabuya basar', () => {
  const G = mk();
  const [d, mate] = G.teams[0].players, rival = G.teams[1].players[0];
  const W = p => ({ id: p.id, host: false });
  G.board[0] = 'anlat';
  no(G, { a: 'start' }, 0, W(mate));
  ok(G, { a: 'start' }, 0, W(d));
  assert.equal(Game.view(G, W(mate)).card, null);
  assert.equal(Game.view(G, W(rival)).card.length, 1);
  assert.equal(Game.view(G, W(d)).role, 'describer');
  no(G, { a: 'ok' }, 0, W(rival));
  no(G, { a: 'tabu' }, 0, W(mate));
  ok(G, { a: 'tabu' }, 0, W(rival));
  ok(G, { a: 'ok', n: 1 }, 0, W(d));
  no(G, { a: 'ok', n: 1 }, 0, W(d));   // aynı karta ikinci dokunuş sayılmaz
});

test('kurucu anlatan yerine turu başlatabilir ve çizim sonucunu girebilir', () => {
  const G = mk();
  const host = { id: G.teams[1].players[1].id, host: true };
  G.board[0] = 'ciz';
  ok(G, { a: 'start' }, 0, host);
  no(G, { a: 'next' }, 0, host);
  ok(G, { a: 'timeup' }, 60000);
  ok(G, { a: 'score', ok: 2, ceza: 0 }, 0, host);
  assert.equal(G.teams[0].pos, 2);
});

test('deste biterse karılıp yeniden dağıtılır', () => {
  const G = mk();
  start(G, 'anlat');
  for (let i = 0; i < 50; i++) ok(G, { a: 'ok' });
  assert.equal(G.cur.card.length, 1);
  assert.ok(G.di <= deck.length);
});

test('oyun durumu JSON ile kaydedilip geri yüklenebilir', () => {
  const G = mk();
  start(G, 'mime');
  const H = JSON.parse(JSON.stringify(G));
  ok(H, { a: 'ok' });
  assert.equal(H.cur.ok, 1);
});
