import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source = readFileSync('app.js', 'utf8').split('const $ =')[0];
const contexts = [], listeners = {}, state = {sound:true};
let nextState = 'running', failResume = false, delayed = false, unlock;
class AudioContext {
  constructor() { this.state = nextState; this.currentTime = 10; this.destination = {}; this.starts = 0; contexts.push(this); }
  close() { this.state = 'closed'; return Promise.resolve(); }
  resume() {
    if (failResume) return Promise.reject(new Error('blocked'));
    if (delayed) return new Promise(resolve => { unlock = () => { this.state = 'running'; resolve(); }; });
    this.state = 'running'; return Promise.resolve();
  }
  createGain() { return {connect(){},disconnect(){},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}}}; }
  createOscillator() { return {frequency:{setValueAtTime(){}},connect(){},disconnect(){},start:()=>this.starts++,stop(){}}; }
}
const on = (kind) => (name, cb) => { listeners[kind + name] = cb; };
const document = {hidden:false, addEventListener:on('d')};
const sandbox = vm.createContext({window:{AudioContext,addEventListener:on('w')},document,navigator:{},state,Date,Promise});
vm.runInContext(source, sandbox);
const play = () => vm.runInContext('sfx(true)', sandbox);
await play(); assert.equal(contexts[0].starts, 2);
// Return from another app/tab, including the iOS apparently-running silent state.
for (const event of ['dvisibilitychange','wpagehide','wblur']) {
  const old = contexts.at(-1);
  document.hidden = event === 'dvisibilitychange'; listeners[event](); document.hidden = false;
  assert.equal(old.state, 'closed');
  await play(); assert.notEqual(contexts.at(-1), old); assert.equal(contexts.at(-1).starts, 2);
}
contexts.at(-1).state = 'interrupted'; const previous = contexts.at(-1);
await play(); assert.notEqual(contexts.at(-1), previous); assert.equal(contexts.at(-1).starts, 2);
contexts.at(-1).state = 'closed'; await play(); assert.equal(contexts.at(-1).starts, 2);
listeners.wblur(); nextState = 'suspended'; delayed = true;
const waiting = play(); assert.equal(contexts.at(-1).starts, 0); unlock(); await waiting;
assert.equal(contexts.at(-1).starts, 2);
listeners.wblur(); const stale = play(), old = contexts.at(-1);
listeners.wpagehide(); unlock(); await stale; assert.equal(old.starts, 0);
const muted = play(), mutedCtx = contexts.at(-1); state.sound = false; unlock(); await muted;
assert.equal(mutedCtx.starts, 0); const count = contexts.length; await play(); assert.equal(contexts.length,count);
state.sound = true; listeners.wblur(); delayed = false; failResume = true;
await play(); assert.equal(contexts.at(-1).state, 'closed');
failResume = false; await play(); assert.equal(contexts.at(-1).starts,2);
document.hidden = true; const before = contexts.at(-1).starts; await play(); assert.equal(contexts.at(-1).starts,before);
console.log('Audio: return, interrupted/closed contexts, resume ordering, stale/muted sounds and recovery passed');
