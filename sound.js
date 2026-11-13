// Sarmal — sesler (WebAudio, ses dosyası yok). Tur boyunca sessiz; son 5 saniyede tik-tak, süre bitince dııııt.
(function () {
  'use strict';
  let ctx, muted = false;
  try { muted = localStorage.getItem('sarmal-sessiz') === '1'; } catch (e) { /* hatırlanmaz: sesli başlar */ }

  // tarayıcılar sesi ilk dokunuşa kadar kilitli tutar; her dokunuşta açık olduğundan emin ol
  addEventListener('pointerdown', () => {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state !== 'running') ctx.resume();
    } catch (e) { /* ses yok */ }
  }, true);

  function tone(freq, at, dur, type, vol, slideTo) {
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + at;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.setValueAtTime(vol, t + Math.max(0.01, dur - 0.08));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  const SFX = {
    tick: () => tone(1700, 0, 0.06, 'triangle', 0.35, 1100),
    tock: () => tone(1100, 0, 0.07, 'triangle', 0.35, 700),
    end: () => { tone(196, 0, 1.1, 'square', 0.16); tone(201, 0, 1.1, 'sawtooth', 0.12); },   // iki yakın ton: vızıldayan düdük
  };

  window.sfx = name => {
    if (muted || !ctx || ctx.state !== 'running' || !SFX[name]) return;
    try { SFX[name](); } catch (e) { /* ses yok */ }
  };
  window.isMuted = () => muted;
  window.toggleMute = () => {
    muted = !muted;
    try { localStorage.setItem('sarmal-sessiz', muted ? '1' : '0'); } catch (e) { /* hatırlanmaz */ }
    return muted;
  };
})();
