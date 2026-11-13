// Sarmal — sesler (WebAudio, ses dosyası yok). Tur boyunca sessiz; son 5 saniyede tik-tak, süre bitince seçilen bitiş sesi.
// Her telefon kendi bitiş sesini ve sessiz ayarını hatırlar.
(function () {
  'use strict';
  let ctx;
  const get = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* hatırlanmaz */ } };
  let muted = get('sarmal-sessiz', '0') === '1', end = get('sarmal-bitis', 'zil');

  // tarayıcılar sesi ilk dokunuşa kadar kilitli tutar; her dokunuşta açık olduğundan emin ol
  addEventListener('pointerdown', () => {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state !== 'running') ctx.resume();
    } catch (e) { /* ses yok */ }
  }, true);

  // ring: true = vurup sönen (zil, gong); false = tutup bırakan
  function tone(freq, at, dur, type, vol, ring, slideTo) {
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + at;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + (ring ? 0.005 : 0.01));
    if (!ring) g.gain.setValueAtTime(vol, t + Math.max(0.01, dur - 0.06));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  const bell = (f, at) => { tone(f, at, 1.6, 'sine', .3, true); tone(f * 2.76, at, .5, 'sine', .07, true); tone(f * 5.4, at, .25, 'sine', .03, true); };
  const ENDS = {
    zil: ['Zil', () => { bell(1319, 0); bell(1047, .35); }],
    bip: ['Bip bip', () => { for (const at of [0, .22, .44]) tone(988, at, .14, 'square', .1); }],
    gong: ['Gong', () => { for (const [f, v, d] of [[98, .3, 2.6], [147, .1, 2], [196, .12, 1.8], [293, .05, 1.2]]) tone(f, 0, d, 'sine', v, true, f * .985); }],
    duduk: ['Hakem düdüğü', () => {
      const o = tone(2600, 0, .55, 'sine', .14), lfo = ctx.createOscillator(), depth = ctx.createGain();
      lfo.frequency.value = 38; depth.gain.value = 140;                       // düdüğün içindeki bilyenin titremesi
      lfo.connect(depth).connect(o.frequency); lfo.start(); lfo.stop(ctx.currentTime + .6);
    }],
  };
  const SFX = {
    tick: () => tone(1700, 0, 0.06, 'triangle', 0.35, false, 1100),
    tock: () => tone(1100, 0, 0.07, 'triangle', 0.35, false, 700),
    end: () => (ENDS[end] || ENDS.zil)[1](),
  };
  const play = f => { if (ctx && ctx.state === 'running') try { f(); } catch (e) { /* ses yok */ } };

  window.sfx = name => { if (!muted && SFX[name]) play(SFX[name]); };
  window.Sound = {
    ends: Object.entries(ENDS).map(([k, [label]]) => [k, label]),
    get end() { return end; },
    setEnd(k) { if (ENDS[k]) { end = k; put('sarmal-bitis', k); } },
    preview(k) {                                                            // sessizdeyken de dinletir: seçerken duyulsun
      if (!ENDS[k] || !ctx) return;
      if (ctx.state === 'running') play(ENDS[k][1]); else ctx.resume().then(() => play(ENDS[k][1]), () => {});   // ilk dokunuşta ses yeni açılıyor
    },
    get muted() { return muted; },
    setMuted(v) { muted = !!v; put('sarmal-sessiz', muted ? '1' : '0'); },
  };
})();
