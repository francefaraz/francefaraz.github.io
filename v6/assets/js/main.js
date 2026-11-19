/* =====================================================================
   SETTINGS: edit these, nothing else needs touching.
   URL overrides: ?accent=magenta  ?agents=24  ?speed=2  ?sound
   ===================================================================== */
const CFG = {
  agents: 16,                         // how many cursors build the page (4 to 60)
  accent: 'mint',                     // mint | magenta | amber | blue  (press C to cycle)
  finale: ['BUILD', '♥', 'MUNEER'],   // what the swarm spells when the contact section is built
  words: ['BUILDER', 'ENGINEER', 'WEB DEVELOPER', 'ANDROID DEVELOPER', 'LEAD', 'GAMER', 'YOUTUBER', 'SHIPPER'],   // the big outlined word cycles through these
  sound: true                         // browsers only allow audio after the first click, tap or key, so it starts then
};
/* ===================================================================== */

(() => {
'use strict';

const ACCENTS = { mint: '#4ae8b5', magenta: '#e36bd6', amber: '#ffb547', blue: '#5aa8ff' };
const HUES = ['#ff6b5e', '#ffb02e', '#ffe14d', '#7dff8f', '#35e0c2', '#4db8ff', '#8f93ff', '#d07bff', '#ff7ac8'];
const ROLES = ['claude', 'codex', 'gemini', 'playwright', 'docker', 'git'];
const SECTION_NAMES = { top: 'the intro', about: 'About', work: 'Work', apps: 'the app shelf', stack: 'Stack', contact: 'Contact' };

const root = document.documentElement;
const params = new URLSearchParams(location.search);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

/* ---------- virtual clock. Its rate is the chosen speed times a "rush" factor:
   the more work is queued (because the visitor scrolls fast), the faster the crew moves. ---------- */
const clock = { now: 0, speed: clamp(parseFloat(params.get('speed')) || 1, .25, 4), rush: 1, timers: new Set(), tweens: new Set() };
const sleep = ms => new Promise(res => clock.timers.add({ at: clock.now + ms, res }));
const animate = (ms, fn) => new Promise(res => clock.tweens.add({ start: clock.now, ms: Math.max(1, ms), fn, res }));
function advanceClock(dt) {
  clock.now += dt * clock.speed * clock.rush;
  for (const t of [...clock.timers]) if (clock.now >= t.at) { clock.timers.delete(t); t.res(); }
  for (const tw of [...clock.tweens]) {
    const k = Math.min(1, (clock.now - tw.start) / tw.ms);
    tw.fn(k);
    if (k >= 1) { clock.tweens.delete(tw); tw.res(); }
  }
}

/* ---------- sound: tiny synth, no audio files ---------- */
const sound = {
  ctx: null, out: null, on: CFG.sound || params.has('sound'), lastTick: 0, greeted: false,
  unlock() {                                    // safe to call any time; only succeeds once the browser allows audio
    if (!this.ctx) {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new Ctx(); this.out = this.ctx.createGain(); this.out.gain.value = .5; this.out.connect(this.ctx.destination);
        this.ctx.onstatechange = () => this.changed();
      } catch (e) { this.ctx = null; return; }
    }
    if (this.ctx.state !== 'running') this.ctx.resume().then(() => this.changed(), () => {});
    this.changed();
  },
  get running() { return !!this.ctx && this.ctx.state === 'running'; },
  changed() {
    const hint = $('#soundHint');
    if (hint) hint.classList.toggle('show', this.on && !this.running);
    if (this.on && this.running && !this.greeted) { this.greeted = true; this.chord(); }   // audible "sound is on"
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
let halo = false;   // after the finale, idle agents circle the email button while the contact section is on screen

class Agent {
  constructor(i, n) {
    this.i = i; this.n = n; this.color = HUES[i % HUES.length]; this.idle = true;
    this.x = scrollX + rand(40, innerWidth - 40); this.y = scrollY - rand(30, 160); this.vx = 0; this.vy = 0;   // drop in from above
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
    const circling = halo && visible.has(finaleBlock);
    const escorting = !circling && this.i < 3 && you.active(t);
    if (circling) {
      const r = boxOf($('.contact .btn.pri') || $('.contact h2')), a = this.i / this.n * Math.PI * 2 + t * .00035;
      tx = r.x + r.w / 2 + Math.cos(a) * (r.w / 2 + 52) - 4; ty = r.y + r.h / 2 + Math.sin(a) * (r.h / 2 + 30) - 7;
    } else if (escorting) {                       // three idle agents keep the visitor company
      const a = this.i / 3 * Math.PI * 2 + t * .0012;
      const rx = you.mode === 'text' ? 140 : 74, ry = you.mode === 'text' ? 100 : 58;   // give readers room
      tx = scrollX + you.x + Math.cos(a) * rx; ty = scrollY + you.y + Math.sin(a) * ry;
    } else {
      const lost = !this.target || this.target.y < scrollY - 40 || this.target.y > scrollY + innerHeight + 40;
      if (lost || t > this.retargetAt || Math.hypot(this.target.x - this.x, this.target.y - this.y) < 12) {
        this.target = { x: scrollX + rand(30, innerWidth - 40), y: scrollY + rand(70, innerHeight - 110) };
        this.retargetAt = t + rand(1400, 3600);
      }
      tx = this.target.x; ty = this.target.y;
    }
    const k = circling ? 5 : escorting ? 4 : 1.5, max = circling ? 900 : escorting ? 1400 : 620;
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
  const section = el.closest('section');
  return { el, layers, job: null, built: false, name: SECTION_NAMES[section && section.id] || 'the page' };
});
for (const L of layerOf.values()) {
  const p = L.el.parentElement && L.el.parentElement.closest('[data-b]');
  const parent = p && layerOf.get(p);
  L.parent = parent && parent.el.closest('[data-block]') === L.el.closest('[data-block]') ? parent : null;
}
const finaleBlock = blocks.find(b => b.el.hasAttribute('data-finale'));
const total = layerOf.size;
let doneCount = 0, started = false, finished = false;

/* ---------- crew panel: progress ring, status, controls ---------- */
const crew = $('#crew'), crewToggle = $('#crewToggle');
$('#nAll').textContent = total;
function showProgress() {
  const p = doneCount / total;
  $('#nDone').textContent = doneCount;
  $('#ring').style.strokeDashoffset = 100 - p * 100;
  $('#pct').textContent = p >= 1 ? '✓' : Math.round(p * 100) + '%';
}
const setStatus = s => { $('#st').textContent = s; };
function refreshStatus() {
  if (finished) return;
  const busy = blocks.filter(b => b.job && !b.built), active = busy.find(b => visible.has(b)) || busy[0];
  if (active) setStatus(`Building ${active.name}…`);
  else if (blocks.every(b => b.built)) { finished = true; setStatus('All built ✓'); }
  else setStatus('Scroll on, the crew follows ↓');
}
function setPanel(open) {
  crew.classList.toggle('open', open);
  crewToggle.setAttribute('aria-expanded', String(open));
}

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
    mega.drawIn(1500).then(() => mega.rotate());
    await sleep(260);
  } else {
    await a.glide(r.x + r.w * rand(.25, .75), r.y + r.h * rand(.3, .7)); a.click(); el.classList.add('on');
    if ('decode' in el.dataset) await decode(el);
    await sleep(110);
  }
  if (L.frame) { const f = L.frame; f.classList.add('out'); setTimeout(() => f.remove(), 200); L.frame = null; }
  doneCount++; showProgress(); sound.pop(doneCount / total); L.resolve();
}
function build(block) {
  if (block.job) return block.job;
  block.job = (async () => {
    const near = L => { const r = boxOf(L.el); return { x: r.x, y: r.y }; };
    const frames = [];
    for (const L of block.layers) { frames.push(run(a => frameLayer(a, L), near(L))); await sleep(42); }
    await Promise.all(frames); await sleep(240);
    const fills = [];
    for (const L of block.layers) { fills.push(run(a => fillLayer(a, L), near(L))); await sleep(64); }
    await Promise.all(fills);
    block.built = true;
    if (block.el.matches('.intro')) pickAccentOnce();   // the name block is built: choose the colour (doesn't wait for below-the-fold hero parts on phones)
    if (block === finaleBlock) finale();
    refreshStatus();
  })();
  refreshStatus();
  return block.job;
}

/* ---------- accent pick: one agent chooses the brand colour ---------- */
const accentNames = Object.keys(ACCENTS);
let accentName = ACCENTS[params.get('accent')] ? params.get('accent') : (ACCENTS[CFG.accent] ? CFG.accent : 'mint');
function setAccent(hex) { root.style.setProperty('--acc', hex); }
function inkNow() { setAccent(ACCENTS[accentName]); root.classList.add('inked'); }
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

/* ---------- scroll-driven building: whatever enters the viewport gets built ---------- */
const visible = new Set();
const observer = new IntersectionObserver(entries => {
  for (const e of entries) {
    const b = blocks.find(x => x.el === e.target);
    if (e.isIntersecting) { visible.add(b); if (started) build(b); } else visible.delete(b);
  }
}, { threshold: .12 });
blocks.forEach(b => observer.observe(b.el));

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
      if (i === words.length - 1) { await sleep(700); sound.chord(); halo = true; stage.classList.add('halo'); break; }
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
addEventListener('pointermove', e => { swarm.mouse.x = e.clientX; swarm.mouse.y = e.clientY; swarm.mouse.t = performance.now(); });

/* ---------- you: the visitor's own cursor joins the crew ----------
   Mouse/trackpad only (touch keeps its native behaviour), and off for reduced motion. */
const YOU_ARROW = '<svg class="arrow" viewBox="0 0 17 22"><path d="M2 1.5v16l4.4-4 3 7 2.6-1.1-3-6.9h6z" fill="currentColor" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/></svg>';
const you = {
  el: null, x: -200, y: -200, seen: -1e9, vy: 0, lastScroll: 0, mode: '', label: '',
  active(t) { return !!this.el && t - this.seen < 2500; },
  init() {
    if (!matchMedia('(pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = this.el = document.createElement('div');
    el.id = 'you'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = ('<i class="ghost">' + YOU_ARROW + '</i>').repeat(4)
      + '<i class="main">' + YOU_ARROW + '</i>' + IBEAM + '<span class="ring"></span><label>you</label>';
    document.body.appendChild(el);
    this.ghosts = $$('.ghost', el); this.main = $('.main', el); this.labelEl = $('label', el);
    this.lastScroll = scrollY;
    root.classList.add('you-cursor');
    addEventListener('pointermove', e => {
      if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      this.x = e.clientX; this.y = e.clientY; this.seen = performance.now();
      el.classList.add('show');
      el.style.transform = `translate3d(${this.x}px,${this.y}px,0)`;
      this.sense(e.target);
    });
    document.addEventListener('mouseout', e => { if (!e.relatedTarget) el.classList.remove('show'); });
    addEventListener('pointerdown', () => { el.classList.remove('click'); void el.offsetWidth; el.classList.add('click'); });
  },
  sense(target) {                               // what is under the pointer: a link, text, or nothing
    const link = target && target.closest && target.closest('a, button');
    const text = !link && target && target.closest && target.closest('p, h1, h2, h3, li, small');
    this.mode = link ? 'link' : text ? 'text' : '';
    this.label = link ? (link.target === '_blank' ? 'open ↗' : 'go') : text ? 'reading' : 'you';
    this.el.dataset.mode = this.mode;
  },
  step() {
    if (!this.el) return;
    this.vy = scrollMotion.v;
    if (scrollMotion.dy && this.el.classList.contains('show')) this.sense(document.elementFromPoint(this.x, this.y));
    const speed = Math.abs(this.vy), scrolling = speed > 140;
    this.ghosts.forEach((g, i) => {                             // a trail behind the direction of travel
      const k = i + 1;
      g.style.transform = `translateY(${(-clamp(this.vy * .012, -22, 22) * k).toFixed(1)}px)`;
      g.style.opacity = scrolling ? (Math.min(.55, speed / 1800) * (1 - k / 5)).toFixed(2) : 0;
    });
    this.main.style.transform = `scaleY(${(1 + Math.min(.28, speed / 5000)).toFixed(3)})`;
    this.el.classList.toggle('scrolling', scrolling);          // always the arrow while moving, so the trail shows
    const text = scrolling ? (this.vy > 0 ? '↓ scrolling' : '↑ scrolling') : this.label;
    if (this.labelEl.textContent !== text) this.labelEl.textContent = text;
  }
};
addEventListener('resize', () => swarm.resize());

/* ---------- scroll motion shared by the "you" cursor, the big word and the marquee ---------- */
const scrollMotion = {
  v: 0, dy: 0, dir: 1, last: 0,
  step(dt) {
    this.dy = scrollY - this.last; this.last = scrollY;
    this.v += (this.dy / Math.max(1, dt) * 1000 - this.v) * Math.min(1, dt * .012);   // smoothed px/s
    if (this.dy) this.dir = Math.sign(this.dy);
  }
};
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- the big word: per-letter outline + scroll fill, cursor spotlight, rotating words ---------- */
const SVGNS = 'http://www.w3.org/2000/svg';
const mega = {
  svg: $('.mega'), word: null, clipRect: null, letters: [], vb: null, idx: 0, drawn: false, rotating: false,
  init() {
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = '400 300px Anton';
    this.ctx = ctx; this.gap = 6;                                // letter spacing in SVG units
    // the frame is as wide as the widest single word; longer phrases shrink to fit it, so the hero never jumps
    const singles = CFG.words.filter(w => !w.includes(' '));
    const widths = (singles.length ? singles : CFG.words).map(w => this.measure(w).total);
    const asc = ctx.measureText('BH').actualBoundingBoxAscent || 270;
    this.maxW = Math.max(...widths); this.asc = asc;
    this.vb = { x: -6, y: -asc - 6, w: this.maxW + 12, h: asc + 12 };
    this.svg.setAttribute('viewBox', `${this.vb.x} ${this.vb.y} ${this.vb.w} ${this.vb.h}`);
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.svg.innerHTML = `<defs><clipPath id="megaFill" clipPathUnits="userSpaceOnUse"><rect x="-2000" width="6000" y="0" height="0"/></clipPath></defs><g class="word"></g>`;
    this.word = $('.word', this.svg); this.clipRect = $('rect', this.svg);
    this.layout(CFG.words[0]);
  },
  measure(word) {
    const adv = [...word].map(ch => this.ctx.measureText(ch).width + this.gap);
    return { adv, total: adv.reduce((a, b) => a + b, 0) - this.gap };
  },
  layout(word) {                                                // one <g> per letter so each can move on its own
    const { adv, total } = this.measure(word);
    const fit = this.fit = Math.min(1, this.maxW / total);
    this.tx = (this.maxW - total * fit) / 2; this.ty = -this.asc * (1 - fit) / 2;   // centre the shrunk word
    this.word.setAttribute('transform', `translate(${this.tx.toFixed(1)} ${this.ty.toFixed(1)}) scale(${fit.toFixed(4)})`);
    this.word.textContent = '';
    let x = 0;
    this.letters = [];
    [...word].forEach((ch, i) => {
      const w = adv[i] - this.gap, cx = x + w / 2; x += adv[i];
      if (ch === ' ') return;
      const g = document.createElementNS(SVGNS, 'g'); g.setAttribute('class', 'L');
      g.innerHTML = `<text class="o" x="${cx}" y="0" text-anchor="middle">${ch}</text><text class="f" x="${cx}" y="0" text-anchor="middle" clip-path="url(#megaFill)">${ch}</text>`;
      this.word.appendChild(g);
      this.letters.push({ g, o: g.firstChild, cx, k: 0, ink: 1 });
    });
    this.svg.setAttribute('aria-label', word.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()));
  },
  setDash(offset) { this.word.style.strokeDashoffset = offset; },
  async drawIn(ms) { await animate(ms, k => this.setDash(2400 * (1 - ease(k)))); this.drawn = true; },
  async swap(next) {                                            // erase stroke by stroke, then draw the next word
    await animate(650, k => { const e = ease(k); this.setDash(2400 * e); this.letters.forEach(L => { L.ink = 1 - e; }); });
    this.layout(next); this.letters.forEach(L => { L.ink = 0; });
    await animate(900, k => { const e = ease(k); this.setDash(2400 * (1 - e)); this.letters.forEach(L => { L.ink = e; }); });
  },
  async rotate() {
    if (this.rotating || calm || CFG.words.length < 2) return;
    this.rotating = true;
    for (;;) {
      await sleep(4200);
      if (!visible.has(megaBlock) || document.hidden) continue;
      const next = CFG.words[++this.idx % CFG.words.length], r = boxOf(this.svg);
      await run(async a => {                                    // an idle agent "retypes" the word
        await a.glide(r.x + r.w * rand(.3, .7), r.y + r.h * .55); a.click(); sound.whoosh();
        await this.swap(next);
      }, { x: r.x + r.w / 2, y: r.y });
    }
  },
  step(dt) {
    if (!this.letters.length) return;
    const r = this.svg.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const s = Math.min(r.width / this.vb.w, r.height / this.vb.h);
    const ox = r.left + (r.width - this.vb.w * s) / 2, oy = r.top + (r.height - this.vb.h * s) / 2;
    // scroll: fill rises from the bottom and the letters spread apart
    const p = calm ? 0 : clamp(scrollY / ((r.bottom + scrollY) * .8), 0, 1);   // full by the time the word scrolls away
    this.clipRect.setAttribute('y', (-this.asc * p).toFixed(1));
    this.clipRect.setAttribute('height', (this.asc * p + 10).toFixed(1));
    const n = this.letters.length, spot = you.active(performance.now()), R = 230 * s + 60;
    this.letters.forEach((L, i) => {
      // cursor spotlight: letters near the "you" cursor fill in, lift and swell
      let target = 0;
      if (spot) {
        const cx = ox + (this.tx + L.cx * this.fit - this.vb.x) * s, cy = oy + (this.ty - this.asc * this.fit / 2 - this.vb.y) * s;
        target = clamp(1 - Math.hypot(you.x - cx, you.y - cy) / R, 0, 1);
      }
      L.k += (target - L.k) * Math.min(1, dt * .012);
      const spread = (i - (n - 1) / 2) * p * 34;
      L.g.style.transform = `translate(${spread.toFixed(1)}px,${(-L.k * 10).toFixed(1)}px) scale(${(1 + L.k * .08).toFixed(3)})`;
      L.o.style.setProperty('--f', ((.07 + L.k * .8) * L.ink).toFixed(3));
      L.o.style.setProperty('--sw', ((2.4 + L.k * 2.2) / this.fit).toFixed(2));   // keep the outline weight even on shrunk words
    });
  }
};
const megaBlock = blocks.find(b => b.el === mega.svg);

/* ---------- the name resolves from scrambled characters ---------- */
async function decode(el) {
  const final = el.textContent, glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@$';
  el.style.width = el.getBoundingClientRect().width + 'px'; el.style.overflow = 'hidden';
  await animate(780, k => {
    const fixed = Math.floor(k * final.length);
    let s = '';
    for (let i = 0; i < final.length; i++) s += i < fixed || final[i] === '.' ? final[i] : glyphs[Math.floor(Math.random() * glyphs.length)];
    el.textContent = s; sound.tick();
  });
  el.textContent = final; el.style.width = ''; el.style.overflow = '';
}

/* ---------- skills marquee: drifts on its own, speeds up and turns with your scroll ---------- */
const marquee = {
  track: $('.mq-track'), offset: 0, width: 0,
  measure() { const set = $('.mq-set', this.track); this.width = set ? set.getBoundingClientRect().width : 0; },
  step(dt) {
    if (!this.track || calm) return;
    if (!this.width) this.measure();
    if (!this.width) return;
    const speed = 42 + Math.min(1800, Math.abs(scrollMotion.v)) * .4;
    this.offset = ((this.offset + speed * scrollMotion.dir * dt / 1000) % this.width + this.width) % this.width;
    this.track.style.transform = `translate3d(${(-this.offset).toFixed(1)}px,0,0)`;
  }
};
addEventListener('resize', () => marquee.measure());

/* ---------- local time chip ---------- */
const istFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
function tickClock() {
  const t = istFormat.format(new Date()), h = parseInt(t, 10);
  const mood = h < 7 ? 'probably asleep' : h < 10 ? 'coffee + code' : h < 19 ? 'likely shipping' : 'side-project hours';
  const timeEl = $('#ist'), moodEl = $('#istMood');           // looked up each tick: typing animations can replace them
  if (timeEl) timeEl.textContent = t;
  if (moodEl) moodEl.textContent = mood;
}

/* ---------- main loop ---------- */
let last = performance.now();
function frame(now) {
  const dt = Math.min(50, now - last); last = now;
  const pendingBlocks = blocks.reduce((n, b) => n + (b.job && !b.built ? 1 : 0), 0);
  clock.rush = clamp(1 + backlog.length / 10 + Math.max(0, pendingBlocks - 1) * .5, 1, 4);
  advanceClock(dt);
  scrollMotion.step(dt);
  for (const a of agents) if (a.idle) a.drift(dt * Math.min(2, clock.speed), now);
  for (const a of agents) a.render();
  swarm.step(dt, now);
  you.step();
  mega.step(dt);
  marquee.step(dt);
  requestAnimationFrame(frame);
}

/* ---------- controls ---------- */
function showFinished() {                       // the whole page at once
  finished = true;
  blocks.forEach(b => { b.job = Promise.resolve(); b.built = true; });
  accentPick = Promise.resolve(); inkNow();
  $$('[data-b]').forEach(e => e.classList.add('on'));
  mega.setDash(0); mega.rotate();
  doneCount = total; showProgress(); setStatus('All built ✓');
}
function reloadWith(flag) {
  try { sessionStorage.setItem('mz-v6', JSON.stringify({ flag, y: flag === 'skip' ? scrollY : 0 })); } catch (e) {}
  if (flag !== 'skip') scrollTo(0, 0);
  location.reload();
}
const replay = () => reloadWith('replay');
function buildAll() { if (!finished) reloadWith('skip'); }   // in-flight jobs can't be cancelled cleanly, so restart straight into the finished page
function setSpeed(s) { clock.speed = s; $('#bSpeed').textContent = 'Speed ' + s + 'x'; }
function showSound() { $('#bSound').textContent = sound.on ? 'Sound on' : 'Sound off'; $('#bSound').classList.toggle('on', sound.on); }
function toggleSound() { sound.on = !sound.on; if (sound.on) sound.unlock(); else sound.changed(); showSound(); }
function cycleAccent() { accentName = accentNames[(accentNames.indexOf(accentName) + 1) % accentNames.length]; inkNow(); }

const onButton = (id, fn) => { $(id).addEventListener('click', e => { e.stopPropagation(); fn(); }); };
onButton('#crewToggle', () => setPanel(!crew.classList.contains('open')));
onButton('#bSpeed', () => setSpeed(clock.speed >= 2 ? .5 : clock.speed >= 1 ? 2 : 1));
onButton('#bSound', toggleSound);
onButton('#bColour', cycleAccent);
onButton('#bSkip', buildAll);
onButton('#bReplay', replay);
addEventListener('click', e => { if (!e.target.closest('#crew')) setPanel(false); });
// first click, tap or key press unlocks audio (browsers block it before any interaction; scrolling doesn't count)
const unlockSound = () => { if (sound.on) sound.unlock(); };
addEventListener('pointerdown', unlockSound, true);
addEventListener('touchend', unlockSound, true);
addEventListener('keydown', e => {
  unlockSound();
  if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest('input, textarea, select, [contenteditable]')) return;
  const k = e.key.toLowerCase();
  if (k === 'escape') setPanel(false);
  else if (k === 'h') setPanel(!crew.classList.contains('open'));
  else if (k === 's') buildAll();
  else if (k === 'r') replay();
  else if (k === 'm') toggleSound();
  else if (k === 'c') cycleAccent();
  else if (k === '1') setSpeed(1);
  else if (k === '2') setSpeed(2);
  else if (k === '3') setSpeed(.5);
});

/* ---------- boot: no gate, the crew starts on its own ---------- */
(async function boot() {
  $('#year').textContent = new Date().getFullYear();
  try {
    await Promise.all([document.fonts.load('400 100px Anton'), document.fonts.load('400 16px Sora')]);
    await document.fonts.ready;
  } catch (e) { /* fall back to system fonts */ }

  mega.init();                                  // split the big word into letters, sized to the widest word
  tickClock(); setInterval(tickClock, 20000);

  const n = clamp(parseInt(params.get('agents'), 10) || CFG.agents, 4, 60);
  $$('.n-agents').forEach(e => { e.textContent = n; });
  for (let i = 0; i < n; i++) { const a = new Agent(i, n); agents.push(a); work(a); }
  you.init();
  $('#avs').innerHTML = HUES.slice(0, 5).map(c => `<i style="background:${c}"></i>`).join('');
  setSpeed(clock.speed); showSound(); showProgress(); swarm.resize();
  if (sound.on) sound.unlock();                 // plays right away where the browser allows it; otherwise the hint shows
  onButton('#soundHint', () => sound.unlock());
  if (matchMedia('(pointer: coarse)').matches) $('#soundHint').lastChild.textContent = 'Tap anywhere for sound';

  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem('mz-v6') || 'null'); sessionStorage.removeItem('mz-v6'); } catch (e) {}
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches && !(saved && saved.flag === 'replay');
  requestAnimationFrame(t => { last = t; frame(t); });

  if ((saved && saved.flag === 'skip') || reduced) {
    showFinished();
    if (saved && saved.y) scrollTo(0, saved.y);
    return;
  }
  // landed below the hero (e.g. a #work link): ink the page now instead of waiting for the colour pick
  if (scrollY > innerHeight * .5) { accentPick = Promise.resolve(); inkNow(); }

  const scan = $('.scan'); scan.style.opacity = 1; sound.whoosh();
  await animate(720, k => { scan.style.transform = `translateY(${ease(k) * innerHeight}px)`; });
  scan.style.opacity = 0;
  started = true;
  for (const b of visible) build(b);
  refreshStatus();
})();
})();
