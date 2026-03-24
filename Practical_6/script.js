'use strict';

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════ */
const KP_NAMES = [
  'Nose','L.Eye','R.Eye','L.Ear','R.Ear',
  'L.Shoulder','R.Shoulder','L.Elbow','R.Elbow',
  'L.Wrist','R.Wrist','L.Hip','R.Hip',
  'L.Knee','R.Knee','L.Ankle','R.Ankle'
];

const IDX = {
  NOSE:0, L_EYE:1, R_EYE:2, L_EAR:3, R_EAR:4,
  L_SH:5, R_SH:6, L_EL:7, R_EL:8,
  L_WR:9, R_WR:10, L_HI:11, R_HI:12,
  L_KN:13, R_KN:14, L_AN:15, R_AN:16
};

// MoveNet connections
const EDGES = [
  [0,1],[0,2],[1,3],[2,4],
  [5,6],[5,7],[7,9],[6,8],[8,10],
  [5,11],[6,12],[11,12],
  [11,13],[13,15],[12,14],[14,16]
];

// Edge → body segment: 0=face, 1=arms, 2=torso, 3=legs
const EDGE_SEG = [0,0,0,0, 1,1,1,1,1,1, 2,2, 3,3,3,3];

// Color themes [face, arms, torso, legs]
const THEMES = {
  neon:   { seg: ['#00c8ff','#00ffaa','#7c4dff','#ffcc00'], t1:'#00c8ff', t2:'#00ffaa', t3:'#ffcc00' },
  fire:   { seg: ['#ff6b35','#ff3c00','#ff9a00','#ffcc44'], t1:'#ff6b35', t2:'#ff9a00', t3:'#ffcc44' },
  matrix: { seg: ['#00ff41','#00cc33','#00aa22','#007711'], t1:'#00ff41', t2:'#00cc33', t3:'#007711' },
  gold:   { seg: ['#ffd700','#ffb300','#ff8c00','#fff0a0'], t1:'#ffd700', t2:'#ffb300', t3:'#ff8c00'  },
};
let currentTheme = THEMES.neon;

function applyTheme(name) {
  currentTheme = THEMES[name] || THEMES.neon;
  const r = document.documentElement.style;
  r.setProperty('--t1', currentTheme.t1);
  r.setProperty('--t2', currentTheme.t2);
  r.setProperty('--t3', currentTheme.t3);
  r.setProperty('--c',  currentTheme.t1);
}

/* ═══════════════════════════════════════════════════════════════
   POSE CLASSIFIER
═══════════════════════════════════════════════════════════════ */
const POSES = [
  { id:'HANDS_UP',  name:'Hands Up',  icon:'🙌', color:'#ff3cac' },
  { id:'T_POSE',    name:'T-Pose',    icon:'✈️',  color:'#00ffaa' },
  { id:'SQUAT',     name:'Squatting', icon:'🏋️', color:'#ffaa00' },
  { id:'SITTING',   name:'Sitting',   icon:'🪑', color:'#7c4dff' },
  { id:'BENDING',   name:'Bending',   icon:'🤸', color:'#ff6b35' },
  { id:'STANDING',  name:'Standing',  icon:'🧍', color:'#00c8ff' },
  { id:'WALKING',   name:'Walking',   icon:'🚶', color:'#00e5ff' },
  { id:'UNKNOWN',   name:'Unknown',   icon:'❓', color:'#555'    },
];

function p(kps, i) {
  const k = kps[i];
  return k ? { x: k.x, y: k.y, s: k.score } : null;
}
function vis(pt, th = 0.22) { return pt && pt.s >= th; }

function angleDeg(a, b, c) {
  const ab = [a.x - b.x, a.y - b.y];
  const cb = [c.x - b.x, c.y - b.y];
  const dot = ab[0]*cb[0] + ab[1]*cb[1];
  const mag = Math.sqrt((ab[0]**2 + ab[1]**2) * (cb[0]**2 + cb[1]**2));
  if (!mag) return 180;
  return Math.acos(Math.min(1, Math.max(-1, dot/mag))) * 180 / Math.PI;
}

function classifyPose(kps, W, H) {
  const ls = p(kps, IDX.L_SH),  rs = p(kps, IDX.R_SH);
  const lh = p(kps, IDX.L_HI),  rh = p(kps, IDX.R_HI);
  const lk = p(kps, IDX.L_KN),  rk = p(kps, IDX.R_KN);
  const la = p(kps, IDX.L_AN),  ra = p(kps, IDX.R_AN);
  const lw = p(kps, IDX.L_WR),  rw = p(kps, IDX.R_WR);

  if (!vis(ls) && !vis(rs)) return 7; // unknown

  const my = (a, b) => (vis(a) && vis(b)) ? (a.y+b.y)/2 : vis(a) ? a.y : vis(b) ? b.y : null;

  const shY = my(ls, rs);
  const hiY = my(lh, rh);
  const knY = my(lk, rk);
  const anY = my(la, ra);

  // HANDS UP — both wrists above shoulders
  if (vis(lw) && vis(rw) && vis(ls) && vis(rs)) {
    if (lw.y < ls.y - 0.05*H && rw.y < rs.y - 0.05*H) return 0;
  }

  // T-POSE — wrists at shoulder height, spread wide
  if (vis(lw) && vis(rw) && vis(ls) && vis(rs)) {
    const spread = Math.abs((lw.x - rw.x));
    const shSpread = Math.abs(ls.x - rs.x);
    const lvlL = Math.abs(lw.y - ls.y);
    const lvlR = Math.abs(rw.y - rs.y);
    if (spread > shSpread * 2.0 && lvlL < 0.1*H && lvlR < 0.1*H) return 1;
  }

  // Knee angles
  let knAngL = 180, knAngR = 180;
  if (vis(lh) && vis(lk) && vis(la)) knAngL = angleDeg(lh, lk, la);
  if (vis(rh) && vis(rk) && vis(ra)) knAngR = angleDeg(rh, rk, ra);
  const knAng = Math.min(knAngL, knAngR);

  // SQUAT — knees very bent, hips close to knees vertically
  if (knAng < 100 && hiY !== null && knY !== null && Math.abs(hiY - knY) < 0.12*H) return 2;

  // SITTING — knees ~90°
  if (knAng < 130 && knAng >= 90 && hiY !== null && knY !== null && Math.abs(hiY - knY) < 0.22*H) return 3;

  // WALKING — ankles at different heights (asymmetric)
  if (vis(la) && vis(ra)) {
    const ankleDiff = Math.abs(la.y - ra.y);
    if (ankleDiff > 0.06*H && knAng > 140) return 6;
  }

  // BENDING — torso tilted
  if (vis(ls) && vis(lh)) {
    const tAngle = Math.abs(Math.atan2(ls.y - lh.y, ls.x - lh.x) * 180/Math.PI);
    if (Math.abs(90 - tAngle) > 38) return 4;
  }

  // STANDING — default upright
  if (shY !== null && hiY !== null && shY < hiY) return 5;

  return 7;
}

/* ═══════════════════════════════════════════════════════════════
   DOM REFS
═══════════════════════════════════════════════════════════════ */
const video      = document.getElementById('video');
const canvas     = document.getElementById('canvas');
const ctx        = canvas.getContext('2d');
const idleScreen = document.getElementById('idle-screen');
const videoWrap  = document.getElementById('video-wrap');
const scanline   = document.getElementById('scanline');
const liveBadge  = document.getElementById('live-badge');

const btnStart  = document.getElementById('btn-start');
const btnStop   = document.getElementById('btn-stop');
const btnSnap   = document.getElementById('btn-snapshot');
const btnClrHist= document.getElementById('btn-clear-hist');

const sbDot     = document.getElementById('sb-dot');
const statusTxt = document.getElementById('status-text');
const statusPill= document.getElementById('status-pill');

const fpsEl     = document.getElementById('fps-val');
const kpEl      = document.getElementById('kp-val');
const confChip  = document.getElementById('conf-chip');

const dpIcon    = document.getElementById('dp-icon');
const dpName    = document.getElementById('dp-name');
const dpSub     = document.getElementById('dp-sub');
const dpBar     = document.getElementById('dp-bar');
const dpBox     = document.getElementById('detected-pose');

const confSlider= document.getElementById('conf-slider');
const confVal   = document.getElementById('conf-val');
const thickSlider=document.getElementById('thick-slider');
const thickVal  = document.getElementById('thick-val');
const ptSlider  = document.getElementById('pt-slider');
const ptVal     = document.getElementById('pt-val');
const togMirror = document.getElementById('tog-mirror');
const togSkel   = document.getElementById('tog-skel');
const togLabels = document.getElementById('tog-labels');
const togHeat   = document.getElementById('tog-heat');

const kpTable   = document.getElementById('kp-table');
const histList  = document.getElementById('hist-list');
const poseStats = document.getElementById('pose-stats');
const snapPrev  = document.getElementById('snapshot-preview');
const footerTime= document.getElementById('footer-time');

/* ═══════════════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════════════ */
let detector = null, stream = null, rafId = null;
let running = false;
let frameCount = 0, lastSecond = performance.now();
let lastPoseIdx = -1;
let historyLog  = [];
let poseCounts  = new Array(POSES.length).fill(0);
let totalFrames = 0;

/* ═══════════════════════════════════════════════════════════════
   BACKGROUND PARTICLES
═══════════════════════════════════════════════════════════════ */
(function particles() {
  const c = document.getElementById('bg-canvas');
  const g = c.getContext('2d');
  let W, H, pts;

  function resize() { W = c.width = window.innerWidth; H = c.height = window.innerHeight; }
  function mk() { return { x:Math.random()*W, y:Math.random()*H, vx:(Math.random()-.5)*.25, vy:(Math.random()-.5)*.25, r:Math.random()*1.2+.2, a:Math.random()*.5+.1 }; }
  function init() { resize(); pts = Array.from({length:70}, mk); }

  function tick() {
    g.clearRect(0,0,W,H);
    const col = getComputedStyle(document.documentElement).getPropertyValue('--t1').trim() || '#00c8ff';
    pts.forEach(p => {
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0)p.x=W; if(p.x>W)p.x=0;
      if(p.y<0)p.y=H; if(p.y>H)p.y=0;
      g.beginPath(); g.arc(p.x,p.y,p.r,0,Math.PI*2);
      g.fillStyle=`rgba(0,200,255,${p.a})`; g.fill();
    });
    for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++){
      const dx=pts[i].x-pts[j].x, dy=pts[i].y-pts[j].y, d=Math.hypot(dx,dy);
      if(d<90){ g.strokeStyle=`rgba(0,200,255,${.07*(1-d/90)})`; g.lineWidth=.5; g.beginPath(); g.moveTo(pts[i].x,pts[i].y); g.lineTo(pts[j].x,pts[j].y); g.stroke(); }
    }
    requestAnimationFrame(tick);
  }
  window.addEventListener('resize', resize);
  init(); tick();
})();

/* ═══════════════════════════════════════════════════════════════
   FOOTER CLOCK
═══════════════════════════════════════════════════════════════ */
function tickClock() {
  footerTime.textContent = new Date().toLocaleTimeString();
  setTimeout(tickClock, 1000);
}
tickClock();

/* ═══════════════════════════════════════════════════════════════
   STATUS HELPERS
═══════════════════════════════════════════════════════════════ */
function setStatus(cls, text, pill, pillCls) {
  sbDot.className = 'sb-dot ' + cls;
  statusTxt.textContent = text;
  statusPill.textContent = pill || text.toUpperCase();
  statusPill.className = 'status-pill ' + (pillCls || cls);
}

/* ═══════════════════════════════════════════════════════════════
   POSE UI
═══════════════════════════════════════════════════════════════ */
function updatePoseUI(idx, avgConf) {
  const pose = POSES[idx];
  dpSub.textContent = `confidence: ${(avgConf*100).toFixed(0)}%`;
  confChip.textContent = (avgConf*100).toFixed(0) + '%';
  dpBar.style.width = (avgConf*100) + '%';
  dpBar.style.background = pose.color;

  if (idx !== lastPoseIdx) {
    dpName.textContent = pose.name.toUpperCase();
    dpName.style.color = pose.color;
    dpIcon.textContent = pose.icon;
    dpBox.classList.add('lit');

    dpIcon.classList.remove('pop');
    void dpIcon.offsetWidth;
    dpIcon.classList.add('pop');

    addHistory(pose);
    lastPoseIdx = idx;
  }

  // stats
  poseCounts[idx]++;
  totalFrames++;
  renderPoseStats();
}

function addHistory(pose) {
  const t = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});
  historyLog.unshift({ icon: pose.icon, name: pose.name, time: t });
  if (historyLog.length > 20) historyLog.pop();
  renderHistory();
}

function renderHistory() {
  if (!historyLog.length) {
    histList.innerHTML = '<span class="empty-hint">no detections yet</span>';
    return;
  }
  histList.innerHTML = historyLog.map(e =>
    `<div class="hist-item">
      <span class="hi-icon">${e.icon}</span>
      <span class="hi-name">${e.name}</span>
      <span class="hi-time">${e.time}</span>
    </div>`
  ).join('');
}

function renderPoseStats() {
  const max = Math.max(...poseCounts, 1);
  poseStats.innerHTML = POSES.map((p, i) =>
    poseCounts[i] > 0 ? `
    <div class="ps-row">
      <span class="ps-icon">${p.icon}</span>
      <span class="ps-name">${p.name}</span>
      <span class="ps-count">${poseCounts[i]}</span>
    </div>
    <div class="ps-track"><div class="ps-fill" style="width:${(poseCounts[i]/max*100).toFixed(0)}%"></div></div>
    ` : ''
  ).join('');
}

function renderKpTable(kps, minConf) {
  const det = kps.filter(k => k.score >= minConf).length;
  kpEl.textContent = `${det}/17`;

  if (!kps.length) {
    kpTable.innerHTML = KP_NAMES.map(n =>
      `<div class="kp-row"><span class="kp-rname">${n}</span><span class="kp-rval">--</span></div>`
    ).join('');
    return;
  }

  kpTable.innerHTML = kps.map((k, i) => {
    const on = k.score >= minConf;
    return `<div class="kp-row ${on?'on':''}">
      <span class="kp-rname">${KP_NAMES[i]}</span>
      <span class="kp-rval">${(k.score*100).toFixed(0)}%</span>
    </div>`;
  }).join('');
}

/* ═══════════════════════════════════════════════════════════════
   DRAWING
═══════════════════════════════════════════════════════════════ */
function getSegColor(edgeIdx) {
  const seg = EDGE_SEG[edgeIdx] || 0;
  return currentTheme.seg[seg] || currentTheme.t1;
}
function getKpColor(i) {
  if (i < 5)  return currentTheme.seg[0]; // face
  if (i < 11) return currentTheme.seg[1]; // arms
  if (i < 13) return currentTheme.seg[2]; // torso
  return currentTheme.seg[3];             // legs
}

function mx(x, mirror) { return mirror ? canvas.width - x : x; }

function drawSkeleton(kps, minConf, mirror, thickness) {
  ctx.lineWidth = thickness;
  ctx.lineCap = 'round';

  EDGES.forEach(([i, j], ei) => {
    const a = kps[i], b = kps[j];
    if (!a || !b || a.score < minConf || b.score < minConf) return;

    const ax = mx(a.x, mirror), bx = mx(b.x, mirror);
    const col = getSegColor(ei);
    const grad = ctx.createLinearGradient(ax, a.y, bx, b.y);
    grad.addColorStop(0, col + 'dd');
    grad.addColorStop(1, col + '66');

    ctx.shadowColor = col;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = grad;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.moveTo(ax, a.y);
    ctx.lineTo(bx, b.y);
    ctx.stroke();
  });
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function drawKeypoints(kps, minConf, mirror, ptSize) {
  kps.forEach((kp, i) => {
    if (kp.score < minConf) return;
    const x = mx(kp.x, mirror), y = kp.y;
    const col = getKpColor(i);

    ctx.shadowColor = col; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(x, y, ptSize, 0, Math.PI*2);
    ctx.fillStyle = '#fff'; ctx.fill();

    ctx.beginPath(); ctx.arc(x, y, ptSize, 0, Math.PI*2);
    ctx.fillStyle = col + 'aa'; ctx.fill();

    ctx.beginPath(); ctx.arc(x, y, ptSize+3, 0, Math.PI*2);
    ctx.strokeStyle = col; ctx.globalAlpha = 0.25; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  });
}

function drawLabels(kps, minConf, mirror) {
  ctx.font = '500 11px "IBM Plex Mono"';
  ctx.textBaseline = 'bottom';
  kps.forEach((kp, i) => {
    if (kp.score < minConf) return;
    const x = mx(kp.x, mirror), y = kp.y;
    const col = getKpColor(i);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const tw = ctx.measureText(KP_NAMES[i]).width;
    ctx.fillRect(x + 6, y - 16, tw + 4, 14);
    ctx.fillStyle = col;
    ctx.fillText(KP_NAMES[i], x + 8, y - 4);
  });
}

function drawHeatmap(kps, minConf, mirror) {
  kps.forEach(kp => {
    if (kp.score < minConf) return;
    const x = mx(kp.x, mirror), y = kp.y;
    const rad = Math.max(20, kp.score * 60);
    const g2 = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g2.addColorStop(0, `rgba(255,80,80,${kp.score * 0.35})`);
    g2.addColorStop(1, 'rgba(255,80,80,0)');
    ctx.fillStyle = g2;
    ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI*2); ctx.fill();
  });
}

/* ═══════════════════════════════════════════════════════════════
   MODEL LOAD
═══════════════════════════════════════════════════════════════ */
async function loadModel() {
  setStatus('loading', 'Loading MoveNet Lightning…', 'LOADING', 'loading');
  await tf.setBackend('webgl');
  await tf.ready();

  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    {
      modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      enableSmoothing: true,
    }
  );

  setStatus('ready', 'Model ready — click START', 'READY', 'ready');
  btnStart.disabled = false;
}

/* ═══════════════════════════════════════════════════════════════
   CAMERA — KEY FIX: wide FOV + object-fit:contain on video
   We request a LOWER resolution (640×480) to avoid over-zoom,
   and use object-fit:contain in CSS so the entire body fits.
═══════════════════════════════════════════════════════════════ */
btnStart.addEventListener('click', async () => {
  btnStart.disabled = true;
  setStatus('loading', 'Opening camera…', 'LOADING', 'loading');

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width:  { ideal: 1280 },   // wider resolution = more scene captured
        height: { ideal: 720  },
        frameRate: { ideal: 60, max: 60 },
        facingMode: 'user',
      },
      audio: false
    });

    video.srcObject = stream;
    await new Promise(r => { video.onloadedmetadata = r; });
    await video.play();

    // Set canvas to match actual video dimensions
    canvas.width  = video.videoWidth  || 1280;
    canvas.height = video.videoHeight || 720;

    idleScreen.classList.add('gone');
    videoWrap.classList.add('live');
    liveBadge.classList.add('show');
    btnSnap.disabled = false;
    btnStop.disabled = false;
    running = true;
    lastPoseIdx = -1;
    poseCounts  = new Array(POSES.length).fill(0);
    totalFrames = 0;
    historyLog  = [];

    setStatus('live', 'Live · Detecting…', 'LIVE', 'live');
    loop();
  } catch (err) {
    setStatus('error', 'Camera denied / unavailable', 'ERROR', 'error');
    btnStart.disabled = false;
    console.error(err);
  }
});

btnStop.addEventListener('click', () => {
  running = false;
  cancelAnimationFrame(rafId);
  if (stream) stream.getTracks().forEach(t => t.stop());
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  idleScreen.classList.remove('gone');
  videoWrap.classList.remove('live');
  liveBadge.classList.remove('show');
  fpsEl.textContent = '--';
  kpEl.textContent  = '0/17';
  confChip.textContent = '--%';
  dpName.textContent = 'NO POSE';
  dpSub.textContent  = 'camera stopped';
  dpBox.classList.remove('lit');
  dpBar.style.width = '0%';
  btnSnap.disabled = true;
  btnStop.disabled = true;
  btnStart.disabled = false;
  setStatus('ready', 'Stopped', 'IDLE', '');
});

/* Snapshot */
btnSnap.addEventListener('click', () => {
  if (!running) return;
  // Composite video + skeleton onto a temp canvas
  const tmp = document.createElement('canvas');
  tmp.width = canvas.width; tmp.height = canvas.height;
  const tc = tmp.getContext('2d');
  if (togMirror.checked) {
    tc.save(); tc.translate(tmp.width, 0); tc.scale(-1, 1);
  }
  tc.drawImage(video, 0, 0, tmp.width, tmp.height);
  if (togMirror.checked) tc.restore();
  tc.drawImage(canvas, 0, 0);

  const url = tmp.toDataURL('image/png');
  const img = document.createElement('img');
  img.src = url;
  snapPrev.innerHTML = '';
  snapPrev.appendChild(img);

  // Also trigger download
  const a = document.createElement('a');
  a.href = url;
  a.download = `pose_${Date.now()}.png`;
  a.click();
});

/* Clear history */
btnClrHist.addEventListener('click', () => {
  historyLog = [];
  renderHistory();
});

/* Sliders */
confSlider.addEventListener('input', () => { confVal.textContent = confSlider.value; });
thickSlider.addEventListener('input',() => { thickVal.textContent = thickSlider.value + 'px'; });
ptSlider.addEventListener('input',   () => { ptVal.textContent   = ptSlider.value + 'px'; });

/* Theme buttons */
document.querySelectorAll('.theme-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyTheme(btn.dataset.theme);
  });
});

/* ═══════════════════════════════════════════════════════════════
   MAIN LOOP
═══════════════════════════════════════════════════════════════ */
async function loop() {
  if (!running) return;

  const minConf = parseFloat(confSlider.value);
  const mirror  = togMirror.checked;
  const skel    = togSkel.checked;
  const labels  = togLabels.checked;
  const heat    = togHeat.checked;
  const thick   = parseInt(thickSlider.value);
  const ptSz    = parseInt(ptSlider.value);

  let poses = [];
  try {
    poses = await detector.estimatePoses(video);
  } catch (_) {}

  // FPS
  frameCount++;
  const now = performance.now();
  if (now - lastSecond >= 1000) {
    fpsEl.textContent = frameCount;
    frameCount = 0;
    lastSecond = now;
  }

  // Draw video on canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (mirror) { ctx.save(); ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  if (mirror) ctx.restore();

  // Dark overlay
  ctx.fillStyle = 'rgba(6,8,14,0.22)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (poses.length > 0) {
    const kps = poses[0].keypoints;

    if (heat)   drawHeatmap(kps, minConf, mirror);
    if (skel) {
      drawSkeleton(kps, minConf, mirror, thick);
      drawKeypoints(kps, minConf, mirror, ptSz);
    }
    if (labels) drawLabels(kps, minConf, mirror);

    const highConf = kps.filter(k => k.score >= minConf);
    const avgConf  = highConf.length ? highConf.reduce((s,k) => s+k.score, 0) / highConf.length : 0;

    renderKpTable(kps, minConf);

    const poseIdx = classifyPose(kps, canvas.width, canvas.height);
    updatePoseUI(poseIdx, avgConf);
  } else {
    renderKpTable([], minConf);
  }

  rafId = requestAnimationFrame(loop);
}

/* ═══════════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════════ */
applyTheme('neon');
renderKpTable([], 0.35);
renderPoseStats();
loadModel();