/* =====================================================================
   SETTINGS: edit these, nothing else needs touching.
   URL overrides: ?accent=magenta  ?agents=24  ?speed=2  ?auto  ?mute
   ===================================================================== */
const CFG = {
  agents: 16,                         // how many cursors build the page (4 to 60)
  accent: 'mint',                     // mint | magenta | amber | blue  (press C to cycle)
  finale: ['BUILD', '♥', 'MUNEER'],   // what the swarm spells at the end
  autostart: false,                   // true = start without a keypress
  sound: true
};
/* ===================================================================== */

(() => {
'use strict';

const ACCENTS = { mint: '#4ae8b5', magenta: '#e36bd6', amber: '#ffb547', blue: '#5aa8ff' };
const HUES = ['#ff6b5e', '#ffb02e', '#ffe14d', '#7dff8f', '#35e0c2', '#4db8ff', '#8f93ff', '#d07bff', '#ff7ac8'];
const ROLES = ['claude', 'codex', 'gemini', 'playwright', 'docker', 'git'];

const root = document.documentElement;
const params = new URLSearchParams(location.search);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

/* ---------- virtual clock: every choreographed step runs on it, so pause and speed just work ---------- */
const clock = { now: 0, speed: clamp(parseFloat(params.get('speed')) || 1, .25, 4), paused: false, timers: new Set(), tweens: new Set() };
const sleep = ms => new Promise(res => clock.timers.add({ at: clock.now + ms, res }));
const animate = (ms, fn) => new Promise(res => clock.tweens.add({ start: clock.now, ms: Math.max(1, ms), fn, res }));
function advanceClock(dt) {
  clock.now += dt * clock.speed;
  for (const t of [...clock.timers]) if (clock.now >= t.at) { clock.timers.delete(t); t.res(); }
  for (const tw of [...clock.tweens]) {
    const k = Math.min(1, (clock.now - tw.start) / tw.ms);
    tw.fn(k);
    if (k >= 1) { clock.tweens.delete(tw); tw.res(); }
  }
}

/* ---------- sound: tiny synth, no audio files ---------- */
const sound = {
  ctx: null, out: null, on: CFG.sound && !params.has('mute'), lastTick: 0,
  unlock() {
    if (this.ctx) { this.ctx.resume(); return; }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx(); this.out = this.ctx.createGain(); this.out.gain.value = .5; this.out.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
  },
  tone(freq, dur = .13, type = 'triangle', vol = .07, delay = 0) {
    if (!this.on || !this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + .02);
  },
  tick() { const n = performance.now(); if (n - this.lastTick < 34) return; this.lastTick = n; this.tone(rand(1700, 2300), .025, 'square', .012); },
  pop(progress) {
    const scale = [0, 2, 4, 7, 9], step = Math.floor(progress * 12) + Math.floor(rand(0, 3));
    this.tone(220 * Math.pow(2, (scale[step % 5] + 12 * Math.floor(step / 5)) / 12), .16, 'triangle', .06);
  },
  chord() { [0, 4, 7, 12, 16].forEach((s, i) => this.tone(330 * Math.pow(2, s / 12), .9, 'triangle', .05, i * .07)); },
  whoosh() { this.tone(180, .5, 'sawtooth', .02); this.tone(90, .6, 'sine', .06); }
};

/* ---------- geometry (document coordinates) ---------- */
const boxOf = el => { const r = el.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; };
const stage = $('#stage');

/* ---------- agents ---------- */
const ARROW = c => `<svg class="arrow" viewBox="0 0 17 22"><path d="M2 1.5v16l4.4-4 3 7 2.6-1.1-3-6.9h6z" fill="${c}" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/></svg>`;
const CROSS = '<svg class="cross" viewBox="0 0 18 18"><path d="M9 1v16M1 9h16" stroke="#07080b" stroke-width="4.4" stroke-linecap="round"/><path d="M9 1v16M1 9h16" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>';
const IBEAM = '<svg class="ibeam" viewBox="0 0 18 18"><path d="M5.5 1.5h7M5.5 16.5h7M9 1.5v15" stroke="#07080b" stroke-width="4.2" stroke-linecap="round"/><path d="M5.5 1.5h7M5.5 16.5h7M9 1.5v15" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>';
const agents = [];
let idleMode = 'orbit';   // orbit (boot screen) | roam (while building) | halo (around the email button at the end)

class Agent {
  constructor(i, n) {
    this.i = i; this.n = n; this.color = HUES[i % HUES.length]; this.idle = true;
    this.x = innerWidth / 2 + rand(-40, 40); this.y = innerHeight / 2 + rand(-40, 40); this.vx = 0; this.vy = 0;
    this.phase = rand(0, Math.PI * 2); this.radius = rand(.75, 1.25); this.spin = rand(.9, 1.5) * (Math.random() < .5 ? 1 : -1);
    this.target = null; this.retargetAt = 0;
    const el = this.el = document.createElement('div');
    el.className = 'agent'; el.style.color = this.color;
    el.innerHTML = ARROW(this.color) + CROSS + IBEAM + '<span class="ring"></span>' + (ROLES[i] ? `<label style="background:${this.color}">${ROLES[i]}</label>` : '');
    stage.appendChild(el);
  }
  tool(name) { this.el.dataset.tool = name; }
  click() { this.el.classList.remove('click'); void this.el.offsetWidth; this.el.classList.add('click'); }
  glide(x, y, opts = {}) {                       // curved move to a point
    const sx = this.x, sy = this.y, dx = x - sx, dy = y - sy, d = Math.hypot(dx, dy) || 1;
    const ms = opts.ms ?? clamp(170 + d * .5, 210, 760);
    const bend = rand(-1, 1) * Math.min(140, d * .3);
    const cx = (sx + x) / 2 - dy / d * bend, cy = (sy + y) / 2 + dx / d * bend;
    this.vx = this.vy = 0;
    return animate(ms, k => {
      const e = ease(k), u = 1 - e;
      this.x = u * u * sx + 2 * u * e * cx + e * e * x;
      this.y = u * u * sy + 2 * u * e * cy + e * e * y;
    });
  }
  drift(dt, t) {                                 // free movement between jobs
    let tx, ty;
    if (idleMode === 'halo') {
      const r = boxOf($('.contact .btn.pri') || $('.contact h2')), a = this.i / this.n * Math.PI * 2 + t * .00035;
      tx = r.x + r.w / 2 + Math.cos(a) * (r.w / 2 + 52) - 4; ty = r.y + r.h / 2 + Math.sin(a) * (r.h / 2 + 30) - 7;
    } else if (idleMode === 'orbit') {
      const cx = scrollX + innerWidth / 2, cy = scrollY + innerHeight / 2, R = Math.min(innerWidth, innerHeight) * .14 * this.radius + 26;
      const a = this.phase + t * .0011 * this.spin;
      tx = cx + Math.cos(a) * R * (1 + .18 * Math.sin(t * .002 + this.i)); ty = cy + Math.sin(a) * R;
    } else {
      const lost = !this.target || this.target.y < scrollY - 40 || this.target.y > scrollY + innerHeight + 40;
      if (lost || t > this.retargetAt || Math.hypot(this.target.x - this.x, this.target.y - this.y) < 12) {
        this.target = { x: scrollX + rand(30, innerWidth - 40), y: scrollY + rand(70, innerHeight - 110) };
        this.retargetAt = t + rand(1400, 3600);
      }
      tx = this.target.x; ty = this.target.y;
    }
    const k = idleMode === 'roam' ? 1.5 : 5, max = idleMode === 'roam' ? 520 : idleMode === 'halo' ? 900 : 2200;
    let wx = (tx - this.x) * k, wy = (ty - this.y) * k;
    const m = Math.hypot(wx, wy); if (m > max) { wx *= max / m; wy *= max / m; }
    const s = Math.min(1, dt * .006);
    this.vx += (wx - this.vx) * s; this.vy += (wy - this.vy) * s;
    this.x += this.vx * dt / 1000; this.y += this.vy * dt / 1000;
  }
  render() { this.el.style.transform = `translate3d(${this.x.toFixed(1)}px,${this.y.toFixed(1)}px,0)`; }
}

/* ---------- job pool: an idle agent near the work takes the job ---------- */
const backlog = [], waiting = [];
function assign(task, near, prefer) {
  if (!waiting.length) { backlog.push(task); return; }
  let best = 0, bestD = Infinity;
  waiting.forEach((w, i) => {
    const d = prefer === w.agent ? -1 : near ? Math.hypot(w.agent.x - near.x, w.agent.y - near.y) : 0;
    if (d < bestD) { bestD = d; best = i; }
  });
  waiting.splice(best, 1)[0].give(task);
}
const run = (fn, near, prefer) => new Promise(done => assign({ fn, done }, near, prefer));
async function work(agent) {
  for (;;) {
    const task = backlog.shift() || await new Promise(give => waiting.push({ agent, give }));
    agent.idle = false;
    try { await task.fn(agent); } catch (e) { console.error(e); }
    agent.tool('arrow'); agent.idle = true; task.done();
  }
}

/* ---------- blocks and layers ---------- */
const layerOf = new Map();
const blocks = $$('[data-block]').map(el => {
  const own = [el, ...$$('[data-b]', el)].filter(n => n.hasAttribute('data-b') && n.closest('[data-block]') === el);
  const layers = own.map(node => {
    const L = { el: node, frame: null };
    L.ready = new Promise(r => { L.resolve = r; });
    layerOf.set(node, L);
    return L;
  });
  return { el, layers, job: null, built: false };
});
for (const L of layerOf.values()) {
  const p = L.el.parentElement && L.el.parentElement.closest('[data-b]');
  const parent = p && layerOf.get(p);
  L.parent = parent && parent.el.closest('[data-block]') === L.el.closest('[data-block]') ? parent : null;
}
const heroBlocks = blocks.filter(b => b.el.closest('.hero'));
const total = layerOf.size;
let doneCount = 0;
$('#nAll').textContent = total;
const showProgress = () => { $('#nDone').textContent = doneCount; $('#bar').style.width = (doneCount / total * 100) + '%'; };
const setStatus = s => { $('#st').textContent = s; };

function makeFrame(r) {
  const f = document.createElement('div');
  f.className = 'frame' + (r.w < 46 ? ' sm' : '');
  f.innerHTML = '<u></u><u></u><u></u><u></u><em></em>';
  f.style.cssText = `left:${r.x}px;top:${r.y}px;width:0;height:0`;
  stage.appendChild(f);
  return f;
}
async function frameLayer(a, L) {               // phase 1: drag a selection box over the element
  const r = boxOf(L.el);
  await a.glide(r.x, r.y); a.tool('cross');
  const f = L.frame = makeFrame(r), label = f.lastChild, sx = a.x, sy = a.y;
  await animate(clamp(150 + Math.hypot(r.w, r.h) * .3, 190, 560), k => {
    const e = ease(k);
    a.x = sx + r.w * e; a.y = sy + r.h * e;
    f.style.width = r.w * e + 'px'; f.style.height = r.h * e + 'px';
    label.textContent = Math.round(r.w * e) + ' × ' + Math.round(r.h * e);
  });
  sound.tick(); a.tool('arrow');
}
function splitChars(el) {
  const original = el.innerHTML, chars = [], nodes = [], walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) {
    const frag = document.createDocumentFragment();
    for (const ch of n.textContent) { const s = document.createElement('span'); s.className = 'ch'; s.textContent = ch; frag.appendChild(s); chars.push(s); }
    n.replaceWith(frag);
  }
  return { original, chars };
}
async function typeText(el, a) {
  const { original, chars } = splitChars(el), n = chars.length;
  el.classList.add('on');
  let shown = 0;
  await animate(clamp(n * 15, 170, 980), k => {
    const upto = Math.round(k * n); if (upto <= shown) return;
    for (let i = shown; i < upto; i++) chars[i].classList.add('v');
    shown = upto;
    const r = chars[upto - 1].getBoundingClientRect();
    if (r.height) { a.x = r.right + scrollX + 2; a.y = r.top + r.height / 2 + scrollY; }
    sound.tick();
  });
  el.innerHTML = original;
}
async function fillLayer(a, L) {                // phase 2: type, click or draw the element in
  if (L.parent) await L.parent.ready;
  const el = L.el, kind = el.dataset.b, r = boxOf(el);
  if (kind === 'text') {
    await a.glide(r.x + 3, r.y + Math.min(r.h / 2, 14)); a.tool('ibeam');
    if (L.frame) L.frame.classList.add('edit');
    await typeText(el, a);
  } else if (kind === 'mega') {
    await a.glide(r.x + r.w * rand(.2, .8), r.y + r.h * .5); a.click(); el.classList.add('on'); sound.whoosh();
    if (L.frame) L.frame.classList.add('edit');
    const text = $('text', el);
    animate(1500, k => { text.style.strokeDashoffset = 2400 * (1 - ease(k)); });
    await sleep(260);
  } else {
    await a.glide(r.x + r.w * rand(.25, .75), r.y + r.h * rand(.3, .7)); a.click(); el.classList.add('on');
    await sleep(110);
  }
  if (L.frame) { const f = L.frame; f.classList.add('out'); setTimeout(() => f.remove(), 200); L.frame = null; }
  doneCount++; showProgress(); sound.pop(doneCount / total); L.resolve();
}
function build(block) {
  if (block.job) return block.job;
  return block.job = (async () => {
    const near = L => { const r = boxOf(L.el); return { x: r.x, y: r.y }; };
    const frames = [];
    for (const L of block.layers) { frames.push(run(a => frameLayer(a, L), near(L))); await sleep(42); }
    await Promise.all(frames); await sleep(240);
    const fills = [];
    for (const L of block.layers) { fills.push(run(a => fillLayer(a, L), near(L))); await sleep(64); }
    await Promise.all(fills);
    block.built = true;
    if (heroBlocks.every(b => b.built)) pickAccentOnce();
    if (block.el.hasAttribute('data-finale')) finale();
    if (!autoOn && blocks.every(b => b.built)) { finished = true; setStatus('Done'); updatePlayIcon(); }
  })();
}

/* ---------- accent pick: one agent chooses the brand colour ---------- */
const accentNames = Object.keys(ACCENTS);
let accentName = ACCENTS[params.get('accent')] ? params.get('accent') : (ACCENTS[CFG.accent] ? CFG.accent : 'mint');
const setAccent = hex => root.style.setProperty('--acc', hex);
let accentPick = null;
const pickAccentOnce = () => accentPick || (accentPick = pickAccent());
async function pickAccent() {
  const anchor = boxOf($('.name')), order = accentNames.filter(n => n !== accentName).slice(0, 2).concat(accentName);
  const p = document.createElement('div');
  p.className = 'picker';
  p.innerHTML = accentNames.map(n => `<i data-n="${n}" style="background:${ACCENTS[n]}"></i>`).join('');
  p.style.left = anchor.x + anchor.w + 18 + 'px'; p.style.top = anchor.y + 6 + 'px';
  if (anchor.x + anchor.w + 18 + 170 > innerWidth) { p.style.left = anchor.x + 'px'; p.style.top = anchor.y + anchor.h + 12 + 'px'; }
  stage.appendChild(p);
  await sleep(60); p.classList.add('show');
  await run(async a => {
    for (const n of order) {
      const swatch = $(`[data-n="${n}"]`, p), r = boxOf(swatch);
      await a.glide(r.x + r.w / 2, r.y + r.h / 2, { ms: 300 });
      $$('i', p).forEach(i => i.classList.toggle('sel', i === swatch));
      setAccent(ACCENTS[n]);
      if (n === accentName) root.classList.add('inked');
      sound.pop(n === accentName ? .9 : .4);
      await sleep(n === accentName ? 120 : 330);
    }
    a.click(); sound.chord(); await sleep(420);
  }, { x: anchor.x + anchor.w, y: anchor.y }, agents[2]);
  p.classList.remove('show'); setTimeout(() => p.remove(), 260);
}

/* ---------- tour: the page scrolls itself and builds what comes into view.
   Scrolling by hand takes over; leave it alone for a moment and the tour carries on. ---------- */
let started = false, touring = false, finished = false, autoOn = true, resumable = false, gliding = false;
let tourGen = 0, manualUntil = 0, startedAt = 0;
const maxScroll = () => Math.max(0, root.scrollHeight - innerHeight);
function scrollToY(y, ms, gen) {
  const from = scrollY, to = clamp(y, 0, maxScroll());
  if (Math.abs(to - from) < 2) return Promise.resolve();
  return animate(ms, k => { if (gen === tourGen) scrollTo(0, from + (to - from) * ease(k)); });
}
async function tour() {
  const gen = ++tourGen, alive = () => gen === tourGen;
  touring = true; updatePlayIcon();
  for (let i = 0; i < blocks.length;) {
    const vh = innerHeight, first = boxOf(blocks[i].el), top = first.y;
    let j = i, bottom = top + first.h;
    while (j + 1 < blocks.length) {
      const r = boxOf(blocks[j + 1].el);
      if (r.y + r.h > top + vh - 70) break;
      j++; bottom = Math.max(bottom, r.y + r.h);
    }
    const group = blocks.slice(i, j + 1), groupH = bottom - top, isFirst = i === 0;
    if (!group.every(b => b.built)) {
      const target = isFirst ? 0 : groupH < vh - 120 ? top - Math.min((vh - 100 - groupH) / 2, vh * .18) : top - 28;
      setStatus(isFirst ? 'Building' : 'Touring');
      const scroll = scrollToY(target, clamp(Math.abs(target - scrollY) * 1.4, 450, 1400), gen);
      await sleep(isFirst ? 0 : 300); if (!alive()) return;
      const jobs = group.map((b, k) => b.job || sleep(k * 120).then(() => build(b)));
      const tall = groupH > vh - 40 ? scroll.then(() => sleep(800)).then(() => scrollToY(bottom - vh + 100, 2400, gen)) : null;
      await Promise.all([scroll, tall, ...jobs]); if (!alive()) return;
      if (isFirst) { await pickAccentOnce(); if (!alive()) return; }
      await sleep(isFirst ? 800 : 520); if (!alive()) return;
    }
    i = j + 1;
  }
  if (scrollY < maxScroll() - 60) { await scrollToY(maxScroll(), 1300, gen); if (!alive()) return; }
  touring = false; finished = true; setStatus('Done'); updatePlayIcon();
}
function takeOver(e) {                          // the visitor scrolled by hand
  if (!started || clock.paused) return;
  if (finished) { if (gliding) { gliding = false; tourGen++; setStatus('Done'); } return; }
  if (e && e.type === 'wheel' && (Math.abs(e.deltaY) < 4 || performance.now() - startedAt < 1200)) return;
  manualUntil = performance.now() + 1700;
  if (touring) { touring = false; tourGen++; setStatus('Manual'); for (const b of visible) build(b); }
}
function toggleAuto() {
  if (finished) { glide(); return; }
  autoOn = !autoOn; $('#bAuto').classList.toggle('on', autoOn); manualUntil = 0;
  if (!autoOn && touring) { touring = false; tourGen++; for (const b of visible) build(b); }
  if (started) setStatus(autoOn ? 'Touring' : 'Auto-scroll off');
}
async function glide() {                        // once built: one slow scroll from top to bottom
  const gen = ++tourGen; gliding = true; setStatus('Gliding');
  await scrollToY(0, 900, gen); await sleep(450); if (gen !== tourGen) return;
  const d = maxScroll();
  await animate(d / .17, k => { if (gen === tourGen) scrollTo(0, d * k); });
  if (gen === tourGen) { gliding = false; setStatus('Done'); }
}
const visible = new Set();
const observer = new IntersectionObserver(entries => {
  for (const e of entries) {
    const b = blocks.find(x => x.el === e.target);
    if (e.isIntersecting) { visible.add(b); if (started && !touring) build(b); } else visible.delete(b);
  }
}, { threshold: .12 });
blocks.forEach(b => observer.observe(b.el));
addEventListener('wheel', takeOver, { passive: true });
addEventListener('touchmove', takeOver, { passive: true });

/* ---------- finale: a swarm of cursors spells words ---------- */
const swarm = {
  canvas: $('#swarm'), parts: [], on: false, dpr: 1, mouse: { x: -999, y: -999, t: -9999 },
  cursor: new Path2D('M0 0v15l4.2-3.8 2.8 6.6 2.4-1-2.8-6.5h5.6z'),
  resize() { this.dpr = Math.min(2, devicePixelRatio || 1); this.canvas.width = innerWidth * this.dpr; this.canvas.height = innerHeight * this.dpr; },
  points(word, n) {                             // sample n target points inside the rendered word
    const r = $('#swarmStage').getBoundingClientRect(), W = Math.max(1, Math.round(r.width)), H = Math.max(1, Math.round(r.height));
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true }); g.fillStyle = '#fff';
    if (word === '♥') {
      const s = H * .42; g.translate(W / 2, H * .5); g.beginPath();
      for (let t = 0; t <= Math.PI * 2 + .01; t += .05) {
        const px = 16 * Math.pow(Math.sin(t), 3), py = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        g.lineTo(px * s / 16, py * s / 16);
      }
      g.fill();
    } else {
      let size = H * .98; g.font = `400 ${size}px Anton`;
      const w = g.measureText(word).width;
      if (w > W * .9) { size *= W * .9 / w; g.font = `400 ${size}px Anton`; }
      g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      const m = g.measureText(word);
      g.fillText(word, W / 2, H / 2 + m.actualBoundingBoxAscent / 2 - 4);
    }
    const data = g.getImageData(0, 0, W, H).data, pts = [];
    let area = 0;
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (data[(y * W + x) * 4 + 3] > 128) area += 4;
    const step = Math.max(2, Math.sqrt(area / n) * .98);
    for (let y = step / 2, row = 0; y < H; y += step, row++) {
      for (let x = row % 2 ? step / 2 : 0; x < W; x += step) if (data[((y | 0) * W + (x | 0)) * 4 + 3] > 128) pts.push([x, y]);
    }
    for (let i = pts.length - 1; i > 0; i--) { const k = Math.floor(Math.random() * (i + 1)); [pts[i], pts[k]] = [pts[k], pts[i]]; }
    const out = [];
    for (let i = 0; i < n; i++) {
      const p = pts[i % Math.max(1, pts.length)] || [W / 2, H / 2], jitter = i >= pts.length ? 3 : 0;
      out.push([p[0] - 3 + rand(-jitter, jitter), p[1] - 5 + rand(-jitter, jitter)]);
    }
    return out;
  },
  shape(word) {
    const pts = this.points(word, this.parts.length);
    this.parts.forEach((p, i) => { p.tx = pts[i][0]; p.ty = pts[i][1]; p.vx += rand(-420, 420); p.vy += rand(-420, 420); });
  },
  async play(words) {
    this.resize();
    const small = innerWidth < 700, n = small ? 380 : 760, W = innerWidth, H = innerHeight;
    this.parts = [];
    for (let i = 0; i < n; i++) {
      const side = Math.floor(rand(0, 4));
      const x = side === 0 ? -30 : side === 1 ? W + 30 : rand(0, W), y = side === 2 ? -30 : side === 3 ? H + 30 : rand(0, H);
      this.parts.push({ x, y, vx: 0, vy: 0, tx: 0, ty: 0, k: rand(20, 46), c: HUES[i % HUES.length], s: small ? rand(.36, .5) : rand(.46, .64), ph: rand(0, 6.28) });
    }
    this.on = true;
    for (let i = 0; i < words.length; i++) {
      this.shape(words[i]); sound.whoosh();
      if (i === words.length - 1) { await sleep(700); sound.chord(); idleMode = 'halo'; stage.classList.add('halo'); break; }
      await sleep(i === 0 ? 2300 : 1700);
    }
  },
  step(dt, t) {
    if (!this.on) return;
    const g = this.canvas.getContext('2d'), d = this.dpr, r = $('#swarmStage').getBoundingClientRect();
    const h = Math.min(.032, dt / 1000 * Math.max(1, clock.speed * .8));
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const p of this.parts) {
      const tx = r.left + p.tx + Math.sin(t * .002 + p.ph) * 1.6, ty = r.top + p.ty + Math.cos(t * .0017 + p.ph) * 1.6;
      let ax = (tx - p.x) * p.k - p.vx * 8.2, ay = (ty - p.y) * p.k - p.vy * 8.2;
      const mx = p.x - this.mouse.x, my = p.y - this.mouse.y, md = mx * mx + my * my;
      if (md < 9000 && t - this.mouse.t < 2200) { const f = (9000 - md) * .9 / (Math.sqrt(md) + 1); ax += mx * f; ay += my * f; }
      p.vx += ax * h; p.vy += ay * h; p.x += p.vx * h; p.y += p.vy * h;
      g.setTransform(d * p.s, 0, 0, d * p.s, p.x * d, p.y * d);
      g.fillStyle = p.c; g.fill(this.cursor); g.lineWidth = 1.1; g.strokeStyle = 'rgba(255,255,255,.85)'; g.stroke(this.cursor);
    }
  }
};
let finaleRan = false;
async function finale() { if (finaleRan) return; finaleRan = true; await sleep(350); swarm.play(CFG.finale); }

let hideCursorTimer;
addEventListener('pointermove', e => {
  swarm.mouse.x = e.clientX; swarm.mouse.y = e.clientY; swarm.mouse.t = performance.now();
  root.classList.remove('nocursor'); clearTimeout(hideCursorTimer);
  if (started && !finished) hideCursorTimer = setTimeout(() => root.classList.add('nocursor'), 1300);
});
addEventListener('resize', () => swarm.resize());

/* ---------- main loop ---------- */
let last = performance.now();
function frame(now) {
  const dt = Math.min(50, now - last); last = now;
  if (!clock.paused) {
    advanceClock(dt);
    for (const a of agents) if (a.idle) a.drift(dt * Math.min(2, clock.speed), now);
  }
  for (const a of agents) a.render();
  swarm.step(clock.paused ? 0 : dt, now);
  if (resumable && !touring && !finished && !clock.paused && autoOn && now > manualUntil) tour();
  requestAnimationFrame(frame);
}

/* ---------- start / controls ---------- */
const PLAY = '<path d="M2 1l9 5-9 5z"/>', PAUSE = '<path d="M2 1h3v10H2zM7 1h3v10H7z"/>', AGAIN = '<path d="M6 1.5A4.5 4.5 0 1010.5 6H9a3 3 0 11-3-3v2l3.5-2.75L6 0z"/>';
function updatePlayIcon() {
  $('#icoPlay').innerHTML = finished ? AGAIN : started && !clock.paused ? PAUSE : PLAY;
  $('#bSkip').style.display = finished ? 'none' : '';
}
async function start() {
  if (started) return;
  started = true; startedAt = performance.now();
  root.classList.add('nocursor'); root.classList.remove('locked');
  sound.unlock(); scrollTo(0, 0); updatePlayIcon();
  setStatus('Scanning page…'); $('#hint').style.opacity = 0; $('#bSkipBoot').style.opacity = 0; sound.whoosh();
  const scan = $('.scan'); scan.style.opacity = 1;
  await animate(820, k => { scan.style.transform = `translateY(${ease(k) * innerHeight}px)`; });
  scan.style.opacity = 0;
  idleMode = 'roam'; $('#boot').classList.add('off'); await sleep(260);
  resumable = true;
  if (autoOn) tour(); else for (const b of visible) build(b);
}
function showFinished(status) {                 // the whole page at once
  started = finished = true;
  blocks.forEach(b => { b.job = Promise.resolve(); b.built = true; });
  root.classList.remove('locked', 'nocursor'); $('#boot').classList.add('off');
  setAccent(ACCENTS[accentName]); root.classList.add('inked');
  $$('[data-b]').forEach(e => e.classList.add('on'));
  $('.mega text').style.strokeDashoffset = 0;
  doneCount = total; showProgress(); setStatus(status); updatePlayIcon();
  idleMode = 'halo'; stage.classList.add('halo');   // agents wait by the email button, out of the reader's way
}
function toggle() {
  if (finished) return replay();
  if (!started) return start();
  clock.paused = !clock.paused;
  if (!clock.paused) sound.unlock();
  setStatus(clock.paused ? 'Paused' : touring ? 'Touring' : autoOn ? 'Manual' : 'Auto-scroll off');
  updatePlayIcon();
}
function reloadWith(flag) { try { sessionStorage.setItem('mz-v5', flag); } catch (e) {} scrollTo(0, 0); location.reload(); }
const replay = () => reloadWith('replay');
function skip() {
  if (finished) return;
  if (!started) { showFinished('Built'); return; }
  reloadWith('skip');                           // mid-build: restart straight into the finished page
}
function setSpeed(s) { clock.speed = s; $('#bSpeed').textContent = s + 'x'; }
function toggleSound() { sound.on = !sound.on; if (sound.on) sound.unlock(); $('#bSound').classList.toggle('off', !sound.on); }
function cycleAccent() {
  accentName = accentNames[(accentNames.indexOf(accentName) + 1) % accentNames.length];
  setAccent(ACCENTS[accentName]); root.classList.add('inked');
}

const onButton = (id, fn) => { $(id).addEventListener('click', e => { e.stopPropagation(); fn(); }); };
onButton('#bTour', toggle);
onButton('#bAuto', toggleAuto);
onButton('#bSpeed', () => setSpeed(clock.speed >= 2 ? .5 : clock.speed >= 1 ? 2 : 1));
onButton('#bSound', toggleSound);
onButton('#bSkip', skip);
onButton('#bReplay', replay);
onButton('#bSkipBoot', skip);
addEventListener('click', e => { if (!started && !e.target.closest('.hud')) start(); });
addEventListener('pointerdown', () => sound.ctx && sound.unlock(), true);
addEventListener('keydown', e => {
  if (sound.ctx) sound.unlock();
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === ' ') { e.preventDefault(); toggle(); }
  else if (k === 'r') replay();
  else if (k === 's') skip();
  else if (k === 'm') toggleSound();
  else if (k === 'a') toggleAuto();
  else if (k === 'h') root.classList.toggle('clean');
  else if (k === 'c') cycleAccent();
  else if (k === '1') setSpeed(1);
  else if (k === '2') setSpeed(2);
  else if (k === '3') setSpeed(.5);
  else if (['arrowdown', 'arrowup', 'pagedown', 'pageup', 'home', 'end'].includes(k)) takeOver();
});

/* ---------- boot ---------- */
(async function boot() {
  $('#year').textContent = new Date().getFullYear();
  try {
    await Promise.all([document.fonts.load('400 100px Anton'), document.fonts.load('400 16px Sora')]);
    await document.fonts.ready;
  } catch (e) { /* fall back to system fonts */ }

  // fit the outlined word to its own glyph box so it runs edge to edge
  const svg = $('.mega'), text = $('text', svg), g = document.createElement('canvas').getContext('2d');
  g.font = '400 300px Anton';
  const m = g.measureText(text.textContent);
  const left = m.actualBoundingBoxLeft || 0, width = (m.actualBoundingBoxRight || m.width || 1000) + left;
  const asc = m.actualBoundingBoxAscent || 270, desc = m.actualBoundingBoxDescent || 0;
  // letter-spacing from CSS widens the run beyond the canvas measurement
  const extra = parseFloat(getComputedStyle(text).letterSpacing) || 0;
  svg.setAttribute('viewBox', `${-left - 4} ${-asc - 4} ${width + extra * text.textContent.length + 8} ${asc + desc + 8}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  text.setAttribute('x', 0); text.setAttribute('y', 0);

  const n = clamp(parseInt(params.get('agents'), 10) || CFG.agents, 4, 60);
  $$('.n-agents').forEach(e => { e.textContent = n; });
  for (let i = 0; i < n; i++) { const a = new Agent(i, n); agents.push(a); work(a); }
  $('#avs').innerHTML = HUES.slice(0, 5).map(c => `<i style="background:${c}"></i>`).join('');
  $('#bSound').classList.toggle('off', !sound.on);
  setSpeed(clock.speed); showProgress(); swarm.resize();
  if (matchMedia('(pointer:coarse)').matches) $('#hint').innerHTML = `Tap and ${n} AI agents will build this page`;

  let flag = null;
  try { flag = sessionStorage.getItem('mz-v5'); sessionStorage.removeItem('mz-v5'); } catch (e) {}
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches && flag !== 'replay' && !params.has('auto');
  if (flag === 'skip' || reduced) showFinished('Built');

  requestAnimationFrame(t => { last = t; frame(t); });
  if (!finished && (CFG.autostart || flag === 'replay' || params.has('auto'))) setTimeout(start, 900);
})();
})();
