'use strict';
// Sarmal — sunucu: sayfa dosyaları, odalar (her odada bir lobi ve bir oyun), canlı güncellemeler, tur süresi. Çalıştır: node server.js [port]
// Telefonlar GET /events (server-sent events) ile dinler, hamleleri POST /act ile gönderir; bağımlılık yok.
const http = require('http'), https = require('https'), fs = require('fs'), path = require('path'), os = require('os');
const Game = require('./public/game');
const Words = require('./public/words');
const YEDEK = require('./public/yedek');

const PORT = +process.argv[2] || +process.env.PORT || 3030;
const PUB = path.join(__dirname, 'public');
const CACHE = path.join(__dirname, 'kelimeler.json');   // internetten son çekilen liste; sonraki açılışlar internetsiz de çalışır
const JS = 'text/javascript; charset=utf-8';
const FILES = {                                         // sunulan dosyaların tamamı
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/client.js': ['client.js', JS], '/board.js': ['board.js', JS], '/sound.js': ['sound.js', JS],
  '/game.js': ['game.js', JS], '/words.js': ['words.js', JS], '/yedek.js': ['yedek.js', JS],
};
const TOKEN = /^[a-f0-9]{32}$/;                         // oyuncunun tarayıcısının uydurduğu gizli kimlik
const IDLE = 30 * 60e3;                                 // kimsenin bağlı olmadığı oda bu kadar sonra kapanır
const ABC = 'ABCDEFGHJKLMNPRSTUVYZ23456789';            // oda kodu harfleri; birbirine benzeyenler yok
const LOBBY = ['team+', 'team-', 'assign', 'modes', 'rm'];

let WORDS = YEDEK, WORDS_JSON = JSON.stringify(WORDS);
try { const c = JSON.parse(fs.readFileSync(CACHE, 'utf8')); if (Array.isArray(c) && c.length > WORDS.length) WORDS = c; } catch (e) { /* kayıt yok: yedek liste */ }
WORDS_JSON = JSON.stringify(WORDS);

// shortcut: odalar yalnızca bellekte; sunucu kapanınca gider. Yeniden başlatmaya dayanması gerekirse dosyaya yaz.
const rooms = new Map();                                // id -> { id, L, G, host: token, pid: Map(token -> oyuncu id), timer, seen }
const at = new Map();                                   // token -> bulunduğu oda id (yeniden bağlanınca da kalır)
const clients = new Set();                              // açık olay akışları: { res, t }

const online = t => [...clients].some(c => c.t === t);
const rank = a => /^192\.168\./.test(a) ? 0 : /^10\./.test(a) ? 1 : /^172\.(1[6-9]|2\d|3[01])\./.test(a) ? 2 : 3;   // ev Wi-Fi'si önce, VPN ve sanal ağlar sona
const urls = () => Object.values(os.networkInterfaces()).flat()
  .filter(i => (i.family === 'IPv4' || i.family === 4) && !i.internal)
  .sort((a, b) => rank(a.address) - rank(b.address)).map(i => `http://${i.address}:${PORT}`);

function viewFor(c) {
  const R = rooms.get(at.get(c.t)), v = { now: Date.now(), urls: urls(), room: null };
  if (!R) return v;
  const me = R.pid.get(c.t), host = R.host === c.t, tok = new Map([...R.pid].map(([t, id]) => [id, t]));
  return Object.assign(v, {
    room: R.id, me, host,
    lobby: { ...R.L, players: R.L.players.map(p => ({ ...p, on: online(tok.get(p.id)) })) },
    game: R.G && Game.view(R.G, { id: me, host }),
  });
}
const send = c => c.res.write(`data: ${JSON.stringify(viewFor(c))}\n\n`);
function push(R) { for (const c of clients) if (at.get(c.t) === R.id) send(c); }

function arm(R) {                                       // tur süresi sunucuda tutulur: anlatanın telefonu kapansa da tur biter
  clearTimeout(R.timer); R.timer = null;
  if (!R.G || R.G.phase !== 'play') return;
  R.timer = setTimeout(() => {
    if (!rooms.has(R.id) || !R.G) return;
    if (!Game.act(R.G, { a: 'timeup' }, Date.now(), null)) push(R);
    arm(R);
  }, Math.max(0, R.G.cur.endsAt - Date.now()) + 50);
}

const gone = new Set();                                 // bu hamlede odası elinden giden oyuncular
function closeRoom(R) {
  clearTimeout(R.timer); rooms.delete(R.id);
  for (const [t, id] of at) if (id === R.id) { at.delete(t); gone.add(t); }
}
function leave(t) {
  const R = rooms.get(at.get(t));
  at.delete(t); gone.add(t);
  if (!R) return;
  const id = R.pid.get(t);
  R.pid.delete(t);
  if (!R.G) Game.lobbyAct(R.L, { a: 'rm', pid: id });   // oyun sürüyorsa takımında kalır
  if (R.host === t) R.host = [...R.pid.keys()][0];      // sıradaki kişi kurucu olur
  if (!R.host) closeRoom(R);
}

function handle(t, m) {
  const R = rooms.get(at.get(t));
  switch (m.a) {
    case 'create': {
      if (rooms.size >= 50) return 'Çok fazla oda açık';
      const L = Game.newLobby(), err = Game.lobbyAct(L, { a: 'add', name: m.name });
      if (err) return err;
      if (R) leave(t);
      let id;
      do id = Array.from({ length: 4 }, () => ABC[Math.floor(Math.random() * ABC.length)]).join(''); while (rooms.has(id));
      rooms.set(id, { id, L, G: null, host: t, pid: new Map([[t, L.players.at(-1).id]]), timer: null, seen: Date.now() });
      at.set(t, id);
      return;
    }
    case 'join': {
      const N = rooms.get(String(m.room || '').trim().toLocaleUpperCase('tr'));
      if (!N) return 'Böyle bir oda yok';
      if (N.pid.has(t)) { at.set(t, N.id); return; }    // zaten bu odadaydı: geri döndü
      const err = Game.lobbyAct(N.L, { a: 'add', name: m.name });
      if (err) return err;
      if (R) leave(t);
      N.pid.set(t, N.L.players.at(-1).id);
      at.set(t, N.id);
      return;
    }
    case 'leave':
      if (!R) return 'Bir odada değilsin';
      leave(t);
      return;
  }
  if (!R) return 'Bir odada değilsin';
  const host = R.host === t, me = R.pid.get(t);
  if (LOBBY.includes(m.a)) {
    if (!host) return 'Takımları kurucu ayarlar';
    if (R.G) return 'Oyun sürüyor';
    if (m.a === 'rm') {                                 // kurucu birini odadan çıkarır
      if (m.pid === me) return 'Kendini çıkaramazsın; odadan çık';
      for (const [tt, id] of R.pid) if (id === m.pid) { R.pid.delete(tt); at.delete(tt); gone.add(tt); }
    }
    return Game.lobbyAct(R.L, m);
  }
  switch (m.a) {
    case 'begin':
      if (!host) return 'Oyunu kurucu başlatır';
      if (R.G) return 'Oyun zaten sürüyor';
      try { R.G = Game.fromLobby(R.L, WORDS); } catch (e) { return e.message; }
      return;
    case 'lobby':
      if (!host) return 'Lobiye kurucu döndürür';
      R.G = null;
      return;
    case 'timeup':
      return 'Süreyi sunucu tutar';
  }
  if (!R.G) return 'Oyun başlamadı';
  return Game.act(R.G, m, Date.now(), { id: me, host });
}

function post(req, res) {
  let body = '';
  req.on('data', d => { body += d; if (body.length > 4096) req.destroy(); });
  req.on('end', () => {
    let err = 'Geçersiz istek';
    try {
      const m = JSON.parse(body);
      if (m && typeof m.t === 'string' && TOKEN.test(m.t) && typeof m.a === 'string') {
        const before = rooms.get(at.get(m.t));
        err = handle(m.t, m);
        if (!err) {
          for (const R of new Set([before, rooms.get(at.get(m.t))])) if (R && rooms.has(R.id)) { arm(R); push(R); }
          for (const c of clients) if (gone.has(c.t) && !at.has(c.t)) send(c);   // odadan çıkan ya da çıkarılan ana ekrana döner
        }
        gone.clear();
      }
    } catch (e) {
      if (!(e instanceof SyntaxError)) { console.error(e); err = 'Sunucu hatası'; }   // bir hata odaları düşürmesin
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ err: err || null }));
  });
}

function events(req, res, t) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  const c = { res, t };
  clients.add(c);
  const R = rooms.get(at.get(t));
  if (R) push(R); else send(c);                         // dönen oyuncu odasına geri düşer; diğerleri onu çevrimiçi görür
  req.on('close', () => {
    clients.delete(c);
    const R = rooms.get(at.get(t));
    if (R) push(R);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x'), file = FILES[url.pathname], t = url.searchParams.get('t');
  if (req.method === 'POST' && url.pathname === '/act') return post(req, res);
  if (req.method === 'GET' && url.pathname === '/events' && TOKEN.test(t || '')) return events(req, res, t);
  if (req.method === 'GET' && url.pathname === '/kelimeler.json') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    return res.end(WORDS_JSON);
  }
  if (req.method !== 'GET' || !file) { res.writeHead(404); return res.end('Yok'); }
  res.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-cache' });
  fs.createReadStream(path.join(PUB, file[0])).on('error', () => res.end()).pipe(res);
});

setInterval(() => {
  for (const c of clients) c.res.write(': ping\n\n');   // vekil sunucular ve tüneller boştaki akışı kapatmasın
  for (const R of [...rooms.values()]) {
    if ([...R.pid.keys()].some(online)) R.seen = Date.now();
    else if (Date.now() - R.seen > IDLE) closeRoom(R);
  }
  gone.clear();                                         // kapanan odalarda bağlı kimse yoktu
}, 15000);

// Node 16'da fetch yok: Words.load'a aynı biçimde (ok, json()) yanıt veren küçük bir https.get
const get = url => new Promise((resolve, reject) => {
  https.get(url, { timeout: 10000 }, res => {
    let b = '';
    res.setEncoding('utf8');
    res.on('data', d => { b += d; });
    res.on('end', () => resolve({ ok: res.statusCode === 200, status: res.statusCode, json: async () => JSON.parse(b) }));
  }).on('error', reject).on('timeout', function () { this.destroy(new Error('zaman aşımı')); });
});
Words.load(get).then(list => {
  if (list.length >= WORDS.length) {
    WORDS = list; WORDS_JSON = JSON.stringify(list);
    fs.writeFile(CACHE, WORDS_JSON, e => e && console.error('kelimeler.json yazılamadı:', e.message));
  }
  console.log(`Kelimeler: ${WORDS.length} kart${list.length ? ' (internetten)' : ' (internet yok; kayıtlı/yedek liste)'}`);
});

server.on('error', e => { console.error(e.code === 'EADDRINUSE' ? `${PORT} portu kullanımda. Başka bir portla dene: node server.js 3001` : e); process.exit(1); });
server.listen(PORT, () => {
  console.log(`Sarmal hazır.\n  Bu bilgisayarda : http://localhost:${PORT}`);
  for (const u of urls()) console.log(`  Aynı Wi-Fi'deki telefonlar: ${u}`);
});
