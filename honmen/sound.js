(function(){
let actx = null, soundRequest = 0;
// Recreate on the next answer gesture after leaving the page. iOS can keep an
// interrupted (or even apparently running) context silent after returning.
function releaseSound() {
  soundRequest++;
  const previous = actx;
  actx = null;
  if (previous && previous.state !== 'closed') {
    try { Promise.resolve(previous.close()).catch(() => {}); } catch {}
  }
}
async function sfx(ok) {
  if (window.HonmenApp?.model.state.settings.sound === false || document.hidden) return;
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    if (actx && (actx.state === 'interrupted' || actx.state === 'closed')) releaseSound();
    const ctx = actx || (actx = new C());
    const request = ++soundRequest, requestedAt = Date.now();
    if (ctx.state !== 'running') await ctx.resume();
    // Never play an old answer after a delayed unlock, backgrounding, or mute.
    if (ctx !== actx || request !== soundRequest || ctx.state !== 'running' ||
        document.hidden || window.HonmenApp?.model.state.settings.sound === false || Date.now() - requestedAt > 800) return;
    const t = ctx.currentTime, g = ctx.createGain();
    g.connect(ctx.destination);
    let remaining = 2;
    const tone = (f, st, d, type, vol) => {
      const o = ctx.createOscillator(), v = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t + st);
      v.gain.setValueAtTime(0.0001, t + st);
      v.gain.exponentialRampToValueAtTime(vol, t + st + 0.015);
      v.gain.exponentialRampToValueAtTime(0.0001, t + st + d);
      o.connect(v); v.connect(g);
      o.onended = () => { o.disconnect(); v.disconnect(); if (--remaining === 0) g.disconnect(); };
      o.start(t + st); o.stop(t + st + d + 0.02);
    };
    if (ok) { tone(988, 0, 0.16, 'sine', 0.25); tone(1319, 0.13, 0.32, 'sine', 0.25); }
    else {
      tone(196, 0, 0.32, 'square', 0.09); tone(185, 0.02, 0.32, 'sawtooth', 0.06);
      try { navigator.vibrate && navigator.vibrate(120); } catch {}
    }
  } catch { releaseSound(); }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) releaseSound(); });
window.addEventListener('pagehide', releaseSound);
window.addEventListener('blur', releaseSound);

window.HonmenSound={play:sfx,release:releaseSound};
})();
