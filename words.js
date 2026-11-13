// Sarmal — kelime kaynakları: internetteki açık Türkçe tabu listeleri tek biçimde birleştirilir. Sunucu ve tarayıcı birlikte kullanır.
// Kart biçimi: { w: 'Kedi', t: ['Miyav', ...en çok 5 yasaklı], s: 1 } — s: somut (çizilir/canlandırılır), Çiz ve Pandomim bunlardan seçer.
(function () {
  'use strict';
  const RAW = 'https://raw.githubusercontent.com/';
  const SOMUT_KAT = /hayvan|animal|nesne|eşya|items|yiyecek|yemek|food|mutfak|meslek|profession|spor|ulaşım|transport|giyim|doğa|şehir|mekan|place|ev ve aile|müzik|music|oyun|hobbies|sinema|movies/i;
  const json = f => text => f(JSON.parse(text));
  const lines = (sep, f) => text => text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim()).map(l => f(l.split(sep).map(s => s.trim())));
  const SOURCES = [   // pick: listenin kendi biçiminden [kelime, yasaklılar, somut mu] üçlülerine
    { url: RAW + 'nejdetkadir/turkish-taboo-words/main/data/words.json', pick: json(j => j.map(x => [x.word, x.forbidden_words])) },
    { url: RAW + 'ismaildagtass/Tabu/main/assets/data/words.json', pick: json(j => j.map(x => [x.word, x.forbidden, SOMUT_KAT.test(x.category)])) },
    { url: RAW + 'fignupafya/tabu/main/data/words.json', pick: json(j => j.words.map(x => [x.word, [...x.taboo.easy, ...x.taboo.medium, ...x.taboo.hard]])) },
    { url: RAW + 'mBeratKeremAydin/tabu-flutter/main/assets/data/words.json', pick: json(j => j.words.map(x => [x.word, x.forbidden, SOMUT_KAT.test(x.category)])) },
    { url: RAW + 'yasingulsn/Tabuu/main/Tabuu/app/src/main/assets/words.json', pick: json(j => j.map(x => [x.word, x.tabooWords])) },
    { url: RAW + 'muhammetfatihkurt/kelime-tabusu-app/main/words.json', pick: json(j => j.flatMap(c => c.words.map(x => [x.hedef, x.yasakli, SOMUT_KAT.test(c.name)]))) },
    { url: RAW + 'AdemSoner/Bil-Bakalim/main/app/src/main/java/com/example/bilbakalim/Model/BilBakalimKelimeApi.json', pick: json(j => j.map(x => [x.key, [1, 2, 3, 4, 5].map(i => x['bannedWord' + i])])) },
    { url: RAW + 'hasanberatozturk/TabooGame/master/app/src/main/assets/kelimeler.txt', pick: lines(';', a => [a[0], a.slice(1, 6)]) },
    { url: RAW + 'akurmustafa/taboo/master/database_turkish.txt', pick: lines(',', a => [a[0], a.slice(1)]) },
  ];
  const key = s => s.toLocaleLowerCase('tr');
  const norm = it => typeof it === 'string' ? [it, [], true] : Array.isArray(it) ? it : [it.w, it.t, it.s];   // düz kelime: yalnızca somut havuz

  // lists: [kelime, yasaklılar, somut] üçlüleri, kartlar ya da düz kelimeler. Aynı kelime bir kez (Kedi / KEDİ): ilk gelen kalır,
  // sonrakiler yalnızca eksiğini tamamlar. Yasaklısı 3'ten az ve somut olmayan kelime atılır.
  function merge(lists) {
    const by = new Map(), out = [];
    for (const list of lists) for (const it of list) {
      const [w0, t0, s] = norm(it), w = String(w0 || '').trim();
      if (!w) continue;
      const t = [], tk = new Set([key(w)]);
      for (const x of Array.isArray(t0) ? t0 : []) { const v = String(x || '').trim(); if (v && !tk.has(key(v))) { tk.add(key(v)); t.push(v); } }
      const old = by.get(key(w));
      if (old) {
        if (s) old.s = 1;
        if (old.t.length < 3 && t.length >= 3) old.t = t.slice(0, 5);
        continue;
      }
      if (t.length < 3 && !s) continue;
      const c = { w, t: t.slice(0, 5) };
      if (s) c.s = 1;
      by.set(key(w), c); out.push(c);
    }
    return out;
  }

  // fetchFn(url) -> Promise<{ ok, text() }>; ulaşılamayan ya da biçimi değişmiş kaynak atlanır
  async function load(fetchFn) {
    const got = await Promise.allSettled(SOURCES.map(async s => {
      const r = await fetchFn(s.url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return s.pick(await r.text());
    }));
    return merge(got.filter(g => g.status === 'fulfilled').map(g => g.value));
  }

  const Words = { SOURCES, merge, load };
  if (typeof module !== 'undefined') module.exports = Words; else window.Words = Words;
})();
