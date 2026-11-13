// Sarmal — kelime kaynakları: internetteki açık Türkçe tabu listeleri tek biçimde birleştirilir. Sunucu ve tarayıcı birlikte kullanır.
// Kart biçimi: { w: 'Kedi', t: ['Miyav', 'Pati', ...en çok 5 yasaklı] }
(function () {
  'use strict';
  const RAW = 'https://raw.githubusercontent.com/';
  const SOURCES = [   // pick: listenin kendi biçiminden [kelime, yasaklılar] çiftlerine
    { url: RAW + 'nejdetkadir/turkish-taboo-words/main/data/words.json', pick: j => j.map(x => [x.word, x.forbidden_words]) },
    { url: RAW + 'ismaildagtass/Tabu/main/assets/data/words.json', pick: j => j.map(x => [x.word, x.forbidden]) },
    { url: RAW + 'fignupafya/tabu/main/data/words.json', pick: j => j.words.map(x => [x.word, [...x.taboo.easy, ...x.taboo.medium, ...x.taboo.hard]]) },
    { url: RAW + 'mBeratKeremAydin/tabu-flutter/main/assets/data/words.json', pick: j => j.words.map(x => [x.word, x.forbidden]) },
  ];
  const key = s => s.toLocaleLowerCase('tr');

  function merge(lists) {   // aynı kelime farklı listelerde farklı yazılmış olabilir (Kedi / KEDİ): ilk gelen kalır
    const seen = new Set(), out = [];
    for (const list of lists) for (const [w0, t0] of list) {
      const w = String(w0 || '').trim();
      if (!w || seen.has(key(w)) || !Array.isArray(t0)) continue;
      const t = [], tk = new Set([key(w)]);
      for (const x of t0) { const s = String(x || '').trim(); if (s && !tk.has(key(s))) { tk.add(key(s)); t.push(s); } }
      if (t.length < 3) continue;
      seen.add(key(w));
      out.push({ w, t: t.slice(0, 5) });
    }
    return out;
  }

  // fetchFn(url) -> Promise<{ ok, json() }>; ulaşılamayan ya da biçimi değişmiş kaynak atlanır
  async function load(fetchFn) {
    const got = await Promise.allSettled(SOURCES.map(async s => {
      const r = await fetchFn(s.url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return s.pick(await r.json());
    }));
    return merge(got.filter(g => g.status === 'fulfilled').map(g => g.value));
  }

  const Words = { SOURCES, merge, load };
  if (typeof module !== 'undefined') module.exports = Words; else window.Words = Words;
})();
