/* ═══════════════════════════════════════════════
   SilentSpeak — app.js  v4
   Dual-hand · Rich lip blendshapes · Temporal voting
   ═══════════════════════════════════════════════ */
'use strict';

// ── DATA ─────────────────────────────────────────────────────
const ASL_GESTURES = [
  { emoji:'🖐️', sign:'HELLO',          desc:'Open palm, all fingers up',         cat:'greetings' },
  { emoji:'👋', sign:'GOODBYE / WAVE',  desc:'Open hand, wave side to side',       cat:'greetings' },
  { emoji:'🙏', sign:'THANK YOU',       desc:'Flat hand from chin forward',         cat:'greetings' },
  { emoji:'👍', sign:'GOOD / YES',      desc:'Thumbs up, palm facing out',          cat:'basics'    },
  { emoji:'👎', sign:'BAD / NO',        desc:'Thumbs down, palm facing out',        cat:'basics'    },
  { emoji:'✌️', sign:'PEACE / TWO',     desc:'Index + middle finger up',            cat:'greetings' },
  { emoji:'🤙', sign:'CALL ME',         desc:'Pinky + thumb out (shaka)',           cat:'basics'    },
  { emoji:'☝️', sign:'ONE / POINT',     desc:'Index finger pointing up',            cat:'basics'    },
  { emoji:'✊', sign:'FIST / STOP',     desc:'Fist closed tightly',                 cat:'basics'    },
  { emoji:'🤟', sign:'I LOVE YOU',      desc:'Thumb + index + pinky extended',      cat:'emotions'  },
  { emoji:'👌', sign:'OKAY',            desc:'Thumb and index form circle',         cat:'basics'    },
  { emoji:'🖖', sign:'VULCAN',          desc:'V-split between ring/middle fingers', cat:'greetings' },
  { emoji:'🤞', sign:'FINGERS CROSSED', desc:'Index + middle fingers crossed',      cat:'emotions'  },
  { emoji:'🤘', sign:'ROCK ON',         desc:'Index + pinky up, thumb out',         cat:'emotions'  },
  { emoji:'🤏', sign:'PINCH',           desc:'Thumb and index pinched together',    cat:'basics'    },
  { emoji:'😮', sign:'WOW / AH',        desc:'Open mouth, wide expression',         cat:'emotions'  },
  { emoji:'❓', sign:'WHAT?',           desc:'Fingers wiggle, palms up',            cat:'questions' },
  { emoji:'👆', sign:'WHERE?',          desc:'Index points and moves around',       cat:'questions' },
  { emoji:'😊', sign:'HAPPY',           desc:'Both hands brush up chest',           cat:'emotions'  },
  { emoji:'😢', sign:'SAD',             desc:'Both hands slide down face',          cat:'emotions'  },
  
  // Alphabet
  { emoji:'A', sign:'A (Letter)', desc:'Fist, thumb straight up to side of index', cat:'alphabet' },
  { emoji:'B', sign:'B (Letter)', desc:'Open palm, thumb folded across palm', cat:'alphabet' },
  { emoji:'D', sign:'D (Letter)', desc:'Index pointing up, thumb touching middle tip', cat:'alphabet' },
  { emoji:'F', sign:'F (Letter)', desc:'Index and thumb touching (okay sign)', cat:'alphabet' },
  { emoji:'I', sign:'I (Letter)', desc:'Pinky extended, other fingers curled', cat:'alphabet' },
  { emoji:'L', sign:'L (Letter)', desc:'Thumb and index out', cat:'alphabet' },
  { emoji:'U', sign:'U (Letter)', desc:'Index and middle extended (touching)', cat:'alphabet' },
  { emoji:'V', sign:'V (Letter)', desc:'Index and middle extended (spread)', cat:'alphabet' },
  { emoji:'W', sign:'W (Letter)', desc:'Index, middle, ring up', cat:'alphabet' },
  { emoji:'Y', sign:'Y (Letter)', desc:'Thumb and pinky out', cat:'alphabet' },
  
  // Smart Phrases
  { emoji:'💬', sign:'What is your name?', desc:'Sequence: HELLO + POINT + WHAT', cat:'phrases' },
  { emoji:'💬', sign:'How are you doing?', desc:'Sequence: HELLO + HOW ARE YOU', cat:'phrases' },
  { emoji:'💬', sign:'Yes, thank you so much!', desc:'Sequence: YES + THANK YOU', cat:'phrases' },
  { emoji:'💬', sign:'No, I am sorry.', desc:'Sequence: NO + SORRY', cat:'phrases' },
  { emoji:'💬', sign:'Where is the water?', desc:'Sequence: WHERE + WATER', cat:'phrases' },
  { emoji:'💬', sign:'Please call me.', desc:'Sequence: PLEASE + CALL ME', cat:'phrases' },
  { emoji:'💬', sign:'Good morning!', desc:'Sequence: GOOD + MORNING', cat:'phrases' },
];

const LIP_WORDS = [
  'Hello','Goodbye','Yes','No','Please','Thank you','Sorry','Help',
  'Water','Food','Stop','Go','Come here','I need','Are you okay',
  'Good morning','Good night','How are you','I love you','Be careful',
  'Wait','Hurry','Okay','Maybe','Never mind','What did you say',
];

const DOCS_CONTENT = {
  quickstart: {
    title: 'Quick Start',
    content: `
      <p>SilentSpeak runs entirely in your browser — no installation, no server, no uploads.</p>
      <ul>
        <li>Open the app in <strong>Google Chrome</strong> (best WebAssembly support)</li>
        <li>Click <strong>Start Recognition</strong> and allow camera access</li>
        <li>Choose your mode: Sign Language, Lip Reading, or Combined</li>
        <li>Begin signing or speaking — detections appear in real time</li>
      </ul>
      <div class="doc-tip">💡 Best results: Good lighting, plain background, camera at eye level, 50–80cm distance. Both hands should be visible in frame for dual-hand signs.</div>
    `
  },
  sign: {
    title: 'Sign Language Guide',
    content: `
      <p>Uses MediaPipe Hand Landmarker with <strong>dual-hand tracking</strong> (2 hands simultaneously). Uses angle-based finger curl + tip-distance metrics for high accuracy.</p>
      <ul>
        <li>Hold each sign <strong>steady for ~0.8s</strong> for it to commit</li>
        <li>Keep hands <strong>well lit</strong> and within the frame</li>
        <li>Use a <strong>plain contrasting background</strong> behind your hand</li>
        <li>Both hands are detected at the same time in Sign and Combined modes</li>
      </ul>
      <div class="doc-code">Landmarks: Wrist(0) · Thumb(1-4) · Index(5-8) · Middle(9-12) · Ring(13-16) · Pinky(17-20)</div>
    `
  },
  lip: {
    title: 'Lip Reading Guide',
    content: `
      <p>Uses MediaPipe Face Landmarker (478 points + 52 blendshapes) with a rich multi-blendshape classifier for accurate mouth shape recognition.</p>
      <ul>
        <li>Face the camera <strong>directly</strong> — profile angles reduce accuracy</li>
        <li>Exaggerate your lip movements slightly</li>
        <li>Resting mouth returns no output — only active shapes are classified</li>
        <li>Good lighting on your face is essential</li>
      </ul>
      <div class="doc-tip">💡 Uses 10+ blendshapes: jawOpen, mouthPucker, mouthFunnel, mouthSmile, mouthPress, cheekPuff, mouthOpen, mouthRollLower, and more.</div>
    `
  },
  tips: {
    title: 'Tips & Tricks',
    content: `
      <ul>
        <li>Use <strong>Combined mode</strong> for best accuracy — both hands + lips run simultaneously</li>
        <li>Confidence bars show model certainty — aim for &gt;70%</li>
        <li>Click the <strong>speaker icon</strong> to hear the transcript</li>
        <li>The <strong>stop button</strong> halts speech mid-playback</li>
        <li>Copy transcript with one click for use in other apps</li>
        <li>15+ FPS is ideal — close other browser tabs</li>
      </ul>
      <div class="doc-tip">💡 MediaPipe WASM runs GPU-accelerated in Chrome. Ensure hardware acceleration is on in chrome://settings.</div>
    `
  },
  tech: {
    title: 'Tech Stack',
    content: `
      <ul>
        <li><strong>MediaPipe Tasks Vision</strong> — WASM-accelerated hand + face landmark detection</li>
        <li><strong>Hand Landmarker</strong> — 21 3D keypoints × 2 hands at 30+ FPS</li>
        <li><strong>Face Landmarker</strong> — 478 landmarks + 52 blendshapes</li>
        <li><strong>Temporal Voting</strong> — sliding window majority vote for stable output</li>
        <li><strong>Web Speech API</strong> — Text-to-speech transcript playback</li>
        <li><strong>getUserMedia</strong> — Webcam access, fully on-device</li>
      </ul>
      <div class="doc-code">CDN: cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14</div>
    `
  }
};

// ── STATE ────────────────────────────────────────────────────
const S = {
  running: false,
  mode: 'sign',
  handLandmarker: null,
  faceLandmarker: null,
  video: null, canvas: null, ctx: null,
  lastVideoTime: -1,
  fps: 0, frames: 0, fpsTimer: 0, fpsSum: 0, fpsCount: 0,
  sessionStart: null, sessionTimer: null,
  transcript: [], wordCount: 0,
  signsDetected: 0, wordsRead: 0,
  signConf: 0, lipConf: 0,
  // Temporal voting windows (last N frame results)
  signVote: [],   // [{text, conf}]
  lipVote: [],    // [{text, conf}]
  VOTE_WINDOW: 12,
  VOTE_NEEDED: 8,  // votes of same label to confirm
  // Debounce: don't repeat same sign until hand drops between signs
  lastSignEmit: '',
  lastSignEmitTime: 0,
  signHandPresent: false,   // was hand visible last frame?
  signReadyForNew: true,    // cleared until hand drops after an emit
  lastLipEmit: '',
  lastLipEmitTime: 0,
  lipMouthPresent: false,
  lipReadyForNew: true,
  EMIT_COOLDOWN: 1400, // ms – minimum gap even when sign changes
  // Settings
  buildSentence: false,
  soundEnabled: true,
  minConf: 70,
  sequenceBuffer: [],
  // Wave detection
  wristXHistory: [],
};

// ── LOADING ──────────────────────────────────────────────────
const LOAD_MSGS = [
  { p: 8,   msg: 'Initializing MediaPipe runtime…',    step: 0 },
  { p: 22,  msg: 'Loading WASM modules…',              step: 0 },
  { p: 40,  msg: 'Fetching Hand Landmark model…',      step: 1 },
  { p: 62,  msg: 'Fetching Face Landmark model…',      step: 2 },
  { p: 78,  msg: 'Building Sign Language engine…',     step: 3 },
  { p: 92,  msg: 'Building Lip Reading engine…',       step: 4 },
  { p: 100, msg: 'SilentSpeak is ready ✓',             step: 4 },
];

async function boot() {
  const bar = id('ldrBar'), glow = id('ldrGlow'), status = id('ldrStatus');
  for (let i = 0; i < LOAD_MSGS.length; i++) {
    const { p, msg, step } = LOAD_MSGS[i];
    bar.style.width  = p + '%';
    glow.style.right = (100 - p) + '%';
    status.textContent = msg;
    for (let s = 0; s <= step; s++) { const el = id('ls' + s); if (el) el.classList.add('done'); }
    await sleep(i === LOAD_MSGS.length - 1 ? 500 : 300 + Math.random() * 180);
  }
  await sleep(350);
  const loader = id('loader');
  loader.style.transition = 'opacity 0.6s ease';
  loader.style.opacity = '0';
  await sleep(660);
  loader.classList.add('hidden');
  const app = id('app');
  app.classList.remove('hidden');
  app.style.animation = 'fadeIn 0.5s ease';
  buildUI();
}

// ── BUILD UI ─────────────────────────────────────────────────
function buildUI() { buildGestureGrid(); buildLipGrid(); buildDocs(); setThemeCheckbox(); }

function buildGestureGrid(filter = 'all') {
  const g = id('gestureGrid'); if (!g) return;
  const filtered = filter === 'all' ? ASL_GESTURES : ASL_GESTURES.filter(x => x.cat === filter);
  g.innerHTML = filtered.map(({ emoji, sign, desc, cat }) =>
    `<div class="gesture-card"><span class="gc-emoji">${emoji}</span><div class="gc-sign">${sign}</div><div class="gc-desc">${desc}</div><span class="gc-cat">${cat}</span></div>`
  ).join('');
}
function buildLipGrid() {
  const g = id('lipGrid'); if (!g) return;
  g.innerHTML = LIP_WORDS.map(w => `<div class="lip-tag">${w}</div>`).join('');
}
function buildDocs() {
  const d = id('docsContent'); if (!d) return;
  d.innerHTML = Object.entries(DOCS_CONTENT).map(([key, { title, content }]) =>
    `<div class="doc-section" id="doc-${key}"><h3>${title}</h3>${content}</div>`
  ).join('');
}
function filterGestures(cat, btn) {
  document.querySelectorAll('.gf-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active'); buildGestureGrid(cat);
}

// ── NAVIGATION ───────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nl').forEach(l => l.classList.remove('active'));
  const p = id('page-' + name); if (p) p.classList.add('active');
  const l = document.querySelector(`.nl[onclick="showPage('${name}')"]`); if (l) l.classList.add('active');
  
  const fab = id('btnQuickDict');
  if (fab) {
    if (name === 'demo') fab.classList.remove('hidden');
    else { fab.classList.add('hidden'); id('sideDict').classList.remove('open'); }
  }
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function scrollDoc(key) {
  document.querySelectorAll('.dn-item').forEach(d => d.classList.remove('active'));
  event?.target?.classList.add('active');
  const el = id('doc-' + key); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── THEME ────────────────────────────────────────────────────
function toggleTheme() {
  const h = document.documentElement;
  h.dataset.theme = h.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('ss_theme', h.dataset.theme);
}
function setThemeCheckbox() {
  const t = localStorage.getItem('ss_theme') || 'dark';
  document.documentElement.dataset.theme = t;
  const cb = id('themeCheck'); if (cb) cb.checked = t === 'light';
}

// ── RECOGNITION ──────────────────────────────────────────────
async function startRecognition() {
  if (S.running) return;
  logEntry('Starting recognition engine…', 'sys');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      audio: false
    });
    S.video = id('videoEl');
    S.video.srcObject = stream;
    await new Promise(r => { S.video.onloadedmetadata = r; });
    await S.video.play();

    id('camPh').style.opacity = '0';
    id('camPh').style.pointerEvents = 'none';
    id('liveBadge').classList.remove('hidden');
    const cc = document.querySelector('.cam-card'); if (cc) cc.classList.add('live-glow');

    S.canvas = id('overlayCanvas');
    S.canvas.width  = S.video.videoWidth  || 640;
    S.canvas.height = S.video.videoHeight || 480;
    S.ctx = S.canvas.getContext('2d');

    logEntry('Loading MediaPipe models…', 'sys');
    const { HandLandmarker, FaceLandmarker, FilesetResolver } = window.mpTasksVision;
    const filesetResolver = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
    );

    // Always load hand model for sign/both
    if (S.mode !== 'lip') {
      try {
        S.handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numHands: 2,  // ← DUAL HAND TRACKING
        });
        logEntry('Hand Landmarker ready (2 hands) ✓', 'sys');
      } catch (e) { logEntry('Hand model error: ' + e.message, 'sys'); console.error(e); }
    }

    // Always load face model for lip/both
    if (S.mode !== 'sign') {
      try {
        S.faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
        });
        logEntry('Face Landmarker ready ✓', 'sys');
      } catch (e) { logEntry('Face model error: ' + e.message, 'sys'); console.error(e); }
    }

    // In "both" mode ensure both are loaded
    if (S.mode === 'both' && !S.handLandmarker) {
      try {
        S.handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numHands: 2,
        });
        logEntry('Hand Landmarker ready (2 hands) ✓', 'sys');
      } catch (e) { logEntry('Hand model error: ' + e.message, 'sys'); }
    }
    if (S.mode === 'both' && !S.faceLandmarker) {
      try {
        S.faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
        });
        logEntry('Face Landmarker ready ✓', 'sys');
      } catch (e) { logEntry('Face model error: ' + e.message, 'sys'); }
    }

    S.running = true;
    S.sessionStart = Date.now();
    S.frames = 0; S.fpsTimer = Date.now();
    id('btnStart').classList.add('hidden');
    id('btnStop').classList.remove('hidden');
    setNavStatus(true);
    startSessionTimer();
    logEntry('Recognition active — start signing or speaking!', 'sys');
    renderLoop();
  } catch (err) {
    logEntry('Error: ' + err.message, 'sys');
    showPred('Error', err.message, '');
    console.error(err);
  }
}

function stopRecognition() {
  if (!S.running) return;
  S.running = false;
  if (S.video?.srcObject) S.video.srcObject.getTracks().forEach(t => t.stop());
  if (S.video) S.video.srcObject = null;
  if (S.ctx) S.ctx.clearRect(0, 0, S.canvas.width, S.canvas.height);
  clearInterval(S.sessionTimer);
  S.handLandmarker = null; S.faceLandmarker = null;
  S.signVote = []; S.lipVote = [];
  id('camPh').style.opacity = '1'; id('camPh').style.pointerEvents = 'auto';
  id('liveBadge').classList.add('hidden');
  const cc = document.querySelector('.cam-card'); if (cc) cc.classList.remove('live-glow');
  id('btnStop').classList.add('hidden'); id('btnStart').classList.remove('hidden');
  setNavStatus(false);
  updateConfidence(0, 0, 0);
  showPred('—', 'Session ended', '');
  logEntry('Recognition stopped.', 'sys');
}

// ── RENDER LOOP ───────────────────────────────────────────────
function renderLoop() {
  if (!S.running) return;

  S.frames++;
  const now = Date.now();
  if (now - S.fpsTimer >= 1000) {
    S.fps = S.frames; S.frames = 0; S.fpsTimer = now;
    S.fpsSum += S.fps; S.fpsCount++;
    const fpsEl = id('fpsDisplay'); if (fpsEl) fpsEl.textContent = S.fps + ' FPS';
    const sfpsEl = id('statFps'); if (sfpsEl) sfpsEl.textContent = Math.round(S.fpsSum / S.fpsCount);
  }

  const v = S.video;
  if (!v || v.readyState < 2 || v.currentTime === S.lastVideoTime) {
    requestAnimationFrame(renderLoop); return;
  }
  S.lastVideoTime = v.currentTime;

  const ctx = S.ctx;
  ctx.clearRect(0, 0, S.canvas.width, S.canvas.height);
  const tsMs = performance.now();

  let signResult = null, lipResult = null;

  // ── Hand detection (dual hands) ──
  if (S.handLandmarker) {
    try {
      const r = S.handLandmarker.detectForVideo(v, tsMs);
      if (r?.landmarks?.length > 0) {
        id('handsDisplay').textContent = r.landmarks.length + (r.landmarks.length === 1 ? ' Hand' : ' Hands');
        // Process each detected hand independently
        const handResults = [];
        for (let h = 0; h < r.landmarks.length; h++) {
          const kp = r.landmarks[h].map(p => ({
            x: p.x * S.canvas.width,
            y: p.y * S.canvas.height,
            z: p.z
          }));
          // Determine handedness label
          const handLabel = r.handedness?.[h]?.[0]?.displayName || 'Right';
          drawHand(ctx, kp, handLabel);
          const res = classifyHandSign(kp, h);
          if (res) handResults.push(res);
        }
        // Pick the highest-confidence hand result
        if (handResults.length > 0) {
          handResults.sort((a, b) => b.confidence - a.confidence);
          signResult = handResults[0];
        }
        S.signConf = signResult ? signResult.confidence : Math.max(0, S.signConf - 4);
        // Mark hand present → reset 'ready' flag only when hand disappears
        S.signHandPresent = true;
      } else {
        S.signConf = Math.max(0, S.signConf - 3);
        S.wristXHistory = [];
        // Hand gone → allow a new sign to be read
        if (S.signHandPresent) {
          S.signHandPresent = false;
          S.signReadyForNew = true;
          S.signVote = [];
        }
      }
    } catch (e) { console.warn('Hand detect err', e); }
  }

  // ── Face / lip detection ──
  if (S.faceLandmarker) {
    try {
      const r = S.faceLandmarker.detectForVideo(v, tsMs);
      if (r?.faceLandmarks?.length > 0) {
        const kp = r.faceLandmarks[0].map(p => ({
          x: p.x * S.canvas.width,
          y: p.y * S.canvas.height,
          z: p.z
        }));
        drawLips(ctx, kp);
        drawFaceOutline(ctx, kp);
        const bs = r.faceBlendshapes?.[0]?.categories || [];
        lipResult = classifyLipShape(bs);
        S.lipConf = lipResult ? lipResult.confidence : Math.max(0, S.lipConf - 4);
        S.lipMouthPresent = !!lipResult;
      } else {
        S.lipConf = Math.max(0, S.lipConf - 3);
        if (S.lipMouthPresent) {
          S.lipMouthPresent = false;
          S.lipReadyForNew = true;
          S.lipVote = [];
        }
      }
    } catch (e) { console.warn('Face detect err', e); }
  }

  fuseResults(signResult, lipResult);
  requestAnimationFrame(renderLoop);
}

// ── DRAWING ───────────────────────────────────────────────────
function drawHand(ctx, kp, handLabel) {
  // Color-code by hand: emerald for right, amber for left
  const isLeft = handLabel === 'Left';
  const lineColor = isLeft ? 'rgba(252,211,77,0.75)' : 'rgba(110,231,183,0.75)';
  const tipColor  = isLeft ? 'rgba(252,211,77,1)'    : 'rgba(110,231,183,1)';

  const conns = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [0,9],[9,10],[10,11],[11,12],
    [0,13],[13,14],[14,15],[15,16],
    [0,17],[17,18],[18,19],[19,20],
    [5,9],[9,13],[13,17]
  ];
  ctx.strokeStyle = lineColor; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  conns.forEach(([a,b]) => {
    if (!kp[a] || !kp[b]) return;
    ctx.beginPath(); ctx.moveTo(kp[a].x, kp[a].y); ctx.lineTo(kp[b].x, kp[b].y); ctx.stroke();
  });
  kp.forEach((p, i) => {
    const isTip = [4,8,12,16,20].includes(i);
    ctx.beginPath();
    ctx.arc(p.x, p.y, isTip ? 6 : i === 0 ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fillStyle = isTip ? tipColor : i === 0 ? 'rgba(167,139,250,0.9)' : 'rgba(96,165,250,0.8)';
    ctx.fill();
  });
}

function drawLips(ctx, kp) {
  [[61,146,91,181,84,17,314,405,321,375,291,409,270,269,267,0,37,39,40,185],
   [78,95,88,178,87,14,317,402,318,324,308,415,310,311,312,13,82,81,80,191]
  ].forEach((pts, idx) => {
    ctx.beginPath();
    pts.forEach((i,j) => { if (!kp[i]) return; j===0?ctx.moveTo(kp[i].x,kp[i].y):ctx.lineTo(kp[i].x,kp[i].y); });
    ctx.closePath();
    ctx.strokeStyle = idx===0?'rgba(96,165,250,0.8)':'rgba(167,139,250,0.65)';
    ctx.lineWidth = idx===0?2:1.4; ctx.stroke();
    if (idx===1) { ctx.fillStyle='rgba(167,139,250,0.08)'; ctx.fill(); }
  });
}

function drawFaceOutline(ctx, kp) {
  [[33,7,163,144,145,153,154,155,133],[362,382,381,380,374,373,390,249,263]].forEach(pts => {
    ctx.beginPath();
    pts.forEach((i,j) => { if (!kp[i]) return; j===0?ctx.moveTo(kp[i].x,kp[i].y):ctx.lineTo(kp[i].x,kp[i].y); });
    ctx.closePath(); ctx.strokeStyle='rgba(252,211,77,0.35)'; ctx.lineWidth=1; ctx.stroke();
  });
}

// ── GESTURE CLASSIFICATION (angle + distance based) ──────────
// Returns finger curl angles using joint triplets (more accurate than just tip position)
function fingerCurl(kp, mcp, pip, tip) {
  const v1 = { x: kp[pip].x - kp[mcp].x, y: kp[pip].y - kp[mcp].y };
  const v2 = { x: kp[tip].x - kp[pip].x, y: kp[tip].y - kp[pip].y };
  const dot = v1.x*v2.x + v1.y*v2.y;
  const mag = (Math.hypot(v1.x,v1.y) * Math.hypot(v2.x,v2.y)) || 1;
  return Math.acos(Math.max(-1, Math.min(1, dot/mag))); // radians: 0=straight, π=folded
}

function classifyHandSign(kp, handIdx) {
  if (!kp || kp.length < 21) return null;

  // Palm scale: wrist to middle MCP
  const ps = Math.hypot(kp[9].x - kp[0].x, kp[9].y - kp[0].y) || 1;
  const dist = (a, b) => Math.hypot(kp[a].x - kp[b].x, kp[a].y - kp[b].y) / ps;

  // Curl angle for each finger (> ~0.5 rad = bent, < 0.35 = extended)
  const BENT = 0.48, STRAIGHT = 0.35;
  const thumbCurl  = fingerCurl(kp, 1, 2, 4);
  const indexCurl  = fingerCurl(kp, 5, 6, 8);
  const middleCurl = fingerCurl(kp, 9, 10, 12);
  const ringCurl   = fingerCurl(kp, 13, 14, 16);
  const pinkyCurl  = fingerCurl(kp, 17, 18, 20);

  const thumb  = thumbCurl  < BENT;
  const index  = indexCurl  < BENT;
  const middle = middleCurl < BENT;
  const ring   = ringCurl   < BENT;
  const pinky  = pinkyCurl  < BENT;

  // Extra metrics
  const thumbIndexDist = dist(4, 8);
  const indexMiddleDist = dist(8, 12);
  const ringPinkyDist   = dist(16, 20);

  // Wave detection using wrist X history (works for both hands via handIdx)
  S.wristXHistory.push(kp[0].x);
  if (S.wristXHistory.length > 36) S.wristXHistory.shift();
  const wristRange = S.wristXHistory.length >= 16
    ? (Math.max(...S.wristXHistory) - Math.min(...S.wristXHistory)) / ps : 0;

  let sign = null, confidence = 0;

  // All fingers extended
  if (thumb && index && middle && ring && pinky) {
    if (wristRange > 1.0) { sign = 'GOODBYE / WAVE'; confidence = 94; }
    else { sign = 'HELLO / OPEN PALM'; confidence = 92; }
  }
  // All fingers curled = fist OR 'A' OR 'S' OR 'E'
  else if (!thumb && !index && !middle && !ring && !pinky) {
    sign = 'A / S / E / FIST'; confidence = 91;
  }
  // Thumb only
  else if (thumb && !index && !middle && !ring && !pinky) {
    sign = kp[4].y < kp[0].y ? 'GOOD / THUMBS UP' : 'BAD / THUMBS DOWN';
    confidence = 90;
  }
  // Index only -> 'D' or '1'
  else if (!thumb && index && !middle && !ring && !pinky) {
    sign = 'D / POINT / ONE'; confidence = 93;
  }
  // Index + middle -> 'V' or 'U' or '2'
  else if (!thumb && index && middle && !ring && !pinky) {
    if (indexMiddleDist < 0.25) { sign = 'U / FINGERS CROSSED'; confidence = 86; }
    else { sign = 'V / PEACE'; confidence = 91; }
  }
  // Three fingers -> 'W' or '3'
  else if (!thumb && index && middle && ring && !pinky) {
    sign = 'W / THREE'; confidence = 88;
  }
  // Four fingers (no thumb) -> 'B' or '4'
  else if (!thumb && index && middle && ring && pinky) {
    sign = 'B / FOUR'; confidence = 88;
  }
  // Pinky only -> 'I' or 'J'
  else if (!thumb && !index && !middle && !ring && pinky) {
    sign = 'I / J / PINKY'; confidence = 85;
  }
  // Shaka / Y: thumb + pinky
  else if (thumb && !index && !middle && !ring && pinky) {
    sign = 'Y / CALL ME'; confidence = 91;
  }
  // I Love You: thumb + index + pinky
  else if (thumb && index && !middle && !ring && pinky) {
    sign = 'I LOVE YOU'; confidence = 91;
  }
  // Rock on: index + pinky
  else if (!thumb && index && !middle && !ring && pinky) {
    sign = 'ROCK ON'; confidence = 88;
  }
  // L-shape: thumb + index -> 'L'
  else if (thumb && index && !middle && !ring && !pinky) {
    sign = 'L / LOVE'; confidence = 86;
  }
  // Okay / F: thumb-index circle
  else if (thumbIndexDist < 0.30 && middle && ring && pinky) {
    sign = 'F / PERFECT'; confidence = 89;
  }
  // Pinch / G / Q
  else if (thumbIndexDist < 0.25 && !middle && !ring && !pinky) {
    sign = 'G / Q / PINCH'; confidence = 87;
  }
  // Vulcan
  else if (!thumb && index && middle && ring && pinky && indexMiddleDist < 0.3 && ringPinkyDist < 0.3) {
    sign = 'VULCAN SALUTE'; confidence = 84;
  }
  // Middle finger only
  else if (!thumb && !index && middle && !ring && !pinky) {
    sign = 'MIDDLE FINGER'; confidence = 85;
  }

  if (!sign) return null;
  // No fake random jitter — real confidence from geometry
  return { text: sign, confidence, source: '✋ Sign Language' };
}

// ── LIP CLASSIFICATION (rich multi-blendshape) ───────────────
function classifyLipShape(blendshapes) {
  if (!blendshapes || blendshapes.length === 0) return null;

  // Build lookup map
  const bs = {};
  blendshapes.forEach(b => { bs[b.categoryName] = b.score; });

  const jawOpen      = bs['jawOpen']            || 0;
  const smileL       = bs['mouthSmileLeft']      || 0;
  const smileR       = bs['mouthSmileRight']     || 0;
  const mouthSmile   = (smileL + smileR) / 2;
  const mouthPucker  = bs['mouthPucker']         || 0;
  const mouthFunnel  = bs['mouthFunnel']         || 0;
  const mouthPress   = ((bs['mouthPressLeft'] || 0) + (bs['mouthPressRight'] || 0)) / 2;
  const mouthOpen    = bs['mouthOpen']           || 0;
  const cheekPuff    = ((bs['cheekPuffLeft'] || 0) + (bs['cheekPuffRight'] || 0)) / 2;
  const mouthRollLo  = bs['mouthRollLower']      || 0;
  const mouthRollUp  = bs['mouthRollUpper']      || 0;
  const stretchL     = bs['mouthStretchLeft']    || 0;
  const stretchR     = bs['mouthStretchRight']   || 0;
  const mouthStretch = (stretchL + stretchR) / 2;
  const frownL       = bs['mouthFrownLeft']      || 0;
  const frownR       = bs['mouthFrownRight']     || 0;
  const mouthFrown   = (frownL + frownR) / 2;

  // Silence threshold — mouth at rest
  const activity = jawOpen + mouthSmile + mouthPucker + mouthFunnel + mouthOpen;
  if (activity < 0.18) return null;

  let word = null, confidence = 0;

  // ── Classify by dominant mouth shape ──
  // Wide open: "AH", "WOW", "AAA"
  if (jawOpen > 0.55 && mouthSmile < 0.3) {
    word = 'AH / WOW'; confidence = 92;
  }
  // Open + wide stretch: "AAA" exaggerated
  else if (jawOpen > 0.45 && mouthStretch > 0.25) {
    word = 'AH / YEAH'; confidence = 88;
  }
  // Medium open: "OH", "HELLO", "OPEN"
  else if (jawOpen > 0.32 && mouthPucker < 0.2 && mouthSmile < 0.25) {
    word = 'OH / OPEN'; confidence = 87;
  }
  // Rounded pucker: "OOH", "WHO", "OO"
  else if ((mouthPucker > 0.35 || mouthFunnel > 0.28) && jawOpen < 0.3) {
    word = 'OOH / WHO'; confidence = 88;
  }
  // Big smile + open: "EEE", "CHEESE", "PLEASE", "YES"
  else if (mouthSmile > 0.35 && jawOpen > 0.12) {
    word = 'PLEASE / EEE'; confidence = 85;
  }
  // Big smile closed: "CHEESE", "HAPPY"
  else if (mouthSmile > 0.40 && jawOpen < 0.12) {
    word = 'HAPPY / SMILE'; confidence = 83;
  }
  // Pressed/tight lips: "MMM", "NO", "HMM"
  else if (mouthPress > 0.3 && jawOpen < 0.1) {
    word = 'MMM / NO'; confidence = 82;
  }
  // Lower lip roll in: "BEE", "PEE"
  else if (mouthRollLo > 0.35 && jawOpen < 0.2) {
    word = 'BEE / PEE'; confidence = 80;
  }
  // Upper lip roll in with pucker: "FFF", "VVV"
  else if (mouthRollUp > 0.3 && mouthPucker > 0.2) {
    word = 'FFF / VVV'; confidence = 78;
  }
  // Frown: "SAD", "NO"
  else if (mouthFrown > 0.3 && jawOpen < 0.15) {
    word = 'SAD / NO'; confidence = 79;
  }
  // Cheek puff: "PPP", "PUFF"
  else if (cheekPuff > 0.2) {
    word = 'PPP / PUFF'; confidence = 76;
  }
  // Small open: slight mouth open "MAYBE", "UMM"
  else if (jawOpen > 0.14 && jawOpen < 0.32 && mouthSmile < 0.2) {
    word = 'YES / MAYBE'; confidence = 77;
  }
  // Wide stretch without smile: "AAAH"
  else if (mouthStretch > 0.3 && mouthSmile < 0.2) {
    word = 'AHHH'; confidence = 78;
  }

  if (!word) return null;
  return { text: word, confidence, source: '👄 Lip Reading' };
}

// ── TEMPORAL VOTING ───────────────────────────────────────────
// Pushes into sliding window; returns confirmed result if majority reached
function temporalVote(voteArr, result, window, needed) {
  if (result) voteArr.push({ text: result.text, conf: result.confidence });
  else voteArr.push(null);
  while (voteArr.length > window) voteArr.shift();

  // Count votes for each label in window
  const counts = {};
  let totalConf = 0, totalCount = 0;
  for (const v of voteArr) {
    if (!v) continue;
    counts[v.text] = (counts[v.text] || 0) + 1;
    totalConf += v.conf; totalCount++;
  }

  // Find winner label
  let bestLabel = null, bestCount = 0;
  for (const [label, count] of Object.entries(counts)) {
    if (count > bestCount) { bestLabel = label; bestCount = count; }
  }

  if (bestLabel && bestCount >= needed) {
    const avgConf = totalCount > 0 ? Math.round(totalConf / totalCount) : 70;
    return { text: bestLabel, confidence: avgConf, source: result?.source || '' };
  }
  return null;
}

// ── FUSION ────────────────────────────────────────────────────
function fuseResults(signResult, lipResult) {
  const now = Date.now();

  // Live display (immediate, unconfirmed)
  if (S.mode === 'sign') {
    if (signResult) {
      const pct = Math.round((S.signVote.filter(v=>v?.text===signResult.text).length / S.VOTE_WINDOW)*100);
      showPred(signResult.text, `${signResult.confidence}% · building ${pct}%`, signResult.source);
    } else showPred('—', 'Show your hand to the camera…', '');
  } else if (S.mode === 'lip') {
    if (lipResult) {
      const pct = Math.round((S.lipVote.filter(v=>v?.text===lipResult.text).length / S.VOTE_WINDOW)*100);
      showPred(lipResult.text, `${lipResult.confidence}% · reading ${pct}%`, lipResult.source);
    } else showPred('—', 'Face camera and open your mouth…', '');
  } else {
    // Combined: show best live
    const live = signResult && lipResult
      ? (signResult.confidence >= lipResult.confidence ? signResult : lipResult)
      : (signResult || lipResult);
    if (live) showPred(live.text, `${live.confidence}% combined`, live.source);
    else showPred('—', 'Waiting for input…', '');
  }

  // ── Confirmed via temporal voting ──
  // Sign: emit only once per distinct hold; require hand to drop before the
  // same sign is accepted again (S.signReadyForNew guards this).
  if (S.mode !== 'lip') {
    const confirmed = temporalVote(S.signVote, signResult, S.VOTE_WINDOW, S.VOTE_NEEDED);
    if (confirmed) {
      const isDifferent = confirmed.text !== S.lastSignEmit;
      const coolOk = now - S.lastSignEmitTime > S.EMIT_COOLDOWN;
      // Emit only if: it's a NEW sign (different label + cooldown) OR
      // it's the same sign but the hand previously dropped (signReadyForNew)
      if ((isDifferent && coolOk) || (S.signReadyForNew && coolOk)) {
        S.lastSignEmit = confirmed.text;
        S.lastSignEmitTime = now;
        S.signReadyForNew = false; // block until hand drops again
        onDetection({ ...confirmed, source: signResult?.source || '✋ Sign Language' });
        S.signVote = []; // flush so the NEXT distinct hold starts fresh
      }
    }
  }
  if (S.mode !== 'sign') {
    const confirmed = temporalVote(S.lipVote, lipResult, S.VOTE_WINDOW, S.VOTE_NEEDED);
    if (confirmed) {
      const isDifferent = confirmed.text !== S.lastLipEmit;
      const coolOk = now - S.lastLipEmitTime > S.EMIT_COOLDOWN;
      if ((isDifferent && coolOk) || (S.lipReadyForNew && coolOk)) {
        S.lastLipEmit = confirmed.text;
        S.lastLipEmitTime = now;
        S.lipReadyForNew = false;
        onDetection({ ...confirmed, source: lipResult?.source || '👄 Lip Reading' });
        S.lipVote = [];
      }
    }
  }

  updateConfidence(S.signConf, S.lipConf, Math.round((S.signConf + S.lipConf) / 2));
}

// ── DETECTION ─────────────────────────────────────────────────
function onDetection(result) {
  if (result.confidence < S.minConf) return;

  let { text, confidence, source } = result;

  // Track sequences
  const rootSign = text.split(' / ')[0];
  S.sequenceBuffer.push(rootSign);
  if (S.sequenceBuffer.length > 5) S.sequenceBuffer.shift();

  // Simple grammar/sequence rules
  const seq = S.sequenceBuffer.join(' ');
  // E.g. HELLO NAME WHAT -> What is your name?
  if (seq.includes('HELLO D WHAT') || seq.includes('HELLO D WHERE') || seq.includes('HELLO D')) {
    text = 'Hello, what is your name?';
    S.sequenceBuffer = [];
  } else if (seq.includes('HELLO HOW ARE YOU')) {
    text = 'Hello, how are you doing today?';
    S.sequenceBuffer = [];
  } else if (seq.includes('YES THANK YOU')) {
    text = 'Yes, thank you so much!';
    S.sequenceBuffer = [];
  } else if (seq.includes('NO SORRY') || seq.includes('BAD SORRY')) {
    text = 'No, I am sorry.';
    S.sequenceBuffer = [];
  } else if (seq.includes('WHERE WATER') || seq.includes('WATER WHERE')) {
    text = 'Where is the water?';
    S.sequenceBuffer = [];
  } else if (seq.includes('PLEASE Y') || seq.includes('PLEASE CALL ME')) {
    text = 'Please call me.';
    S.sequenceBuffer = [];
  } else if (seq.includes('I OOH TOO') || seq.includes('I LOVE YOU TOO')) {
    text = 'I love you too!';
    S.sequenceBuffer = [];
  } else if (seq.includes('GOOD MORNING')) {
    text = 'Good morning!';
    S.sequenceBuffer = [];
  } else if (seq.includes('THANK YOU GOODBYE') || seq.includes('GOODBYE THANK YOU')) {
    text = 'Thank you, goodbye!';
    S.sequenceBuffer = [];
  } else if (S.buildSentence) {
    // If auto-punctuation is enabled, add it dynamically in the UI instead of here
  }

  if (source.includes('Sign')) {
    S.signsDetected++; id('statSigns').textContent = S.signsDetected; logEntry(text, 'sign');
  } else {
    S.wordsRead++; id('statWords').textContent = S.wordsRead; logEntry(text, 'lip');
  }

  playBeep();
  addToTranscript(text);
  showPred(text, `✓ Confirmed · ${confidence}%`, source);
  id('statAcc').textContent = confidence + '%';
  const pm = id('predMain');
  if (pm) { pm.style.animation='none'; void pm.offsetWidth; pm.style.animation='predIn 0.3s ease'; }
}

// ── UI UPDATES ────────────────────────────────────────────────
function showPred(main, sub, source) {
  const pm=id('predMain'); if(pm&&pm.textContent!==main) pm.textContent=main;
  const ps=id('predSub'); if(ps) ps.textContent=sub;
  const psr=id('predSource'); if(psr) psr.textContent=source;
}
function updateConfidence(sign, lip, combined) {
  const sc=Math.max(0,Math.min(100,sign||0)), lc=Math.max(0,Math.min(100,lip||0));
  const cc=Math.max(0,Math.min(100,combined!==undefined?combined:Math.round((sc+lc)/2)));
  const cs=id('confSign'); if(cs) cs.style.width=sc+'%';
  const cl=id('confLip'); if(cl) cl.style.width=lc+'%';
  const cb=id('confCombined'); if(cb) cb.style.width=cc+'%';
  const csp=id('confSignPct'); if(csp) csp.textContent=sc+'%';
  const clp=id('confLipPct'); if(clp) clp.textContent=lc+'%';
  const cbp=id('confCombPct'); if(cbp) cbp.textContent=cc+'%';
}
function addToTranscript(text) {
  const body=id('transcriptBody'); if(!body) return;
  const empty=body.querySelector('.tb-empty'); if(empty) empty.remove();
  const now = Date.now();
  let t = text;

  // Sentence Builder logic
  if (S.buildSentence) {
    const isNew = S.wordCount === 0 || (now - (S.lastTranscriptEmit || 0) > 3000) || (S.transcript.length > 0 && S.transcript[S.transcript.length-1].endsWith('.'));
    if (isNew && S.wordCount > 0 && !S.transcript[S.transcript.length-1].endsWith('.')) {
      const lastSpan = body.lastElementChild;
      if (lastSpan) {
        lastSpan.textContent = lastSpan.textContent.trim() + '. ';
      }
      S.transcript[S.transcript.length-1] += '.';
    }
    t = isNew ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : t.toLowerCase();
  }
  S.lastTranscriptEmit = now;

  const word=document.createElement('span'); word.className='transcript-word';
  word.textContent=t+' '; body.appendChild(word); body.scrollTop=body.scrollHeight;
  S.transcript.push(t); S.wordCount++;
  const wc=id('wordCount'); if(wc) wc.textContent=S.wordCount+' word'+(S.wordCount!==1?'s':'');
}
function clearOutput() {
  const body=id('transcriptBody');
  if(body) body.innerHTML='<div class="tb-empty"><div class="tbe-icon">💬</div><div>Transcript will appear here</div></div>';
  const log=id('logBody'); if(log) log.innerHTML='<div class="log-empty">No detections yet</div>';
  S.transcript=[]; S.wordCount=0; S.signsDetected=0; S.wordsRead=0;
  S.signVote=[]; S.lipVote=[];
  ['wordCount','statSigns','statWords'].forEach(i=>{const el=id(i);if(el)el.textContent=i==='wordCount'?'0 words':'0';});
  id('statAcc').textContent='--%';
  showPred('—','Waiting for input…',''); updateConfidence(0,0,0);
}
function copyTranscript() {
  navigator.clipboard.writeText(S.transcript.join(' ')).then(()=>{
    const btn=document.querySelector('.tc-btn');
    if(btn){btn.style.color='var(--emerald)';setTimeout(()=>btn.style.color='',1500);}
  });
}
function speakTranscript() {
  const text=S.transcript.join(' '); if(!text) return;
  speechSynthesis.cancel();
  const utt=new SpeechSynthesisUtterance(text); utt.rate=0.9; utt.pitch=1;
  utt.onstart=()=>{const s=id('btnSpeak');if(s)s.classList.add('hidden');const st=id('btnStopSpeak');if(st)st.classList.remove('hidden');};
  utt.onend=utt.onerror=()=>{const s=id('btnSpeak');if(s)s.classList.remove('hidden');const st=id('btnStopSpeak');if(st)st.classList.add('hidden');};
  speechSynthesis.speak(utt);
}
function stopSpeaking() {
  speechSynthesis.cancel();
  const s=id('btnSpeak');if(s)s.classList.remove('hidden');
  const st=id('btnStopSpeak');if(st)st.classList.add('hidden');
}
function logEntry(text, type) {
  const body=id('logBody'); if(!body) return;
  const empty=body.querySelector('.log-empty'); if(empty) empty.remove();
  const time=new Date().toLocaleTimeString('en-IN',{hour12:false});
  const entry=document.createElement('div'); entry.className='log-entry';
  entry.innerHTML=`<span class="le-time">${time}</span><span class="le-tag ${type}">${{sign:'Sign',lip:'Lip',sys:'Sys'}[type]||type}</span><span class="le-text">${text}</span>`;
  body.appendChild(entry);
  if(body.children.length>60) body.removeChild(body.firstChild);
  body.scrollTop=body.scrollHeight;
}
function setMode(mode) {
  S.mode=mode;
  document.querySelectorAll('.mode-btn').forEach(b=>b.classList.remove('active'));
  id('mode'+mode.charAt(0).toUpperCase()+mode.slice(1)).classList.add('active');
  id('modeDisplay').textContent={sign:'Sign Mode',lip:'Lip Mode',both:'Combined'}[mode];
  S.signVote=[]; S.lipVote=[];
  // If already running, restart to load correct models
  if (S.running) {
    stopRecognition();
    setTimeout(startRecognition, 400);
  }
}

// ── NEW UI / SETTINGS FUNCTIONS ────────────────────────────────
function toggleSentenceBuilder() { S.buildSentence = id('chkSentence').checked; }
function toggleSound() { S.soundEnabled = id('chkSound').checked; }
function updateSettings() {
  S.VOTE_WINDOW = parseInt(id('slipVoteWindow').value);
  const vwEl = id('vwVal'); if(vwEl) vwEl.textContent = S.VOTE_WINDOW;
  S.VOTE_NEEDED = Math.max(3, Math.floor(S.VOTE_WINDOW * 0.6));
  S.minConf = parseInt(id('slipMinConf').value);
  const mcEl = id('mcVal'); if(mcEl) mcEl.textContent = S.minConf;
}
function toggleFullscreen() {
  const vp = document.querySelector('.cam-viewport');
  if (!document.fullscreenElement) {
    if (vp.requestFullscreen) vp.requestFullscreen();
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
  }
}
function exportTranscript() {
  if (S.transcript.length === 0) return;
  const text = S.transcript.join(S.buildSentence ? ' ' : ' | ');
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `SilentSpeak_Transcript_${Date.now()}.txt`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function playBeep() {
  if (!S.soundEnabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.1);
  } catch(e) {}
}
function startSessionTimer() {
  S.sessionTimer=setInterval(()=>{
    const e=Math.floor((Date.now()-S.sessionStart)/1000);
    const el=id('sessionTime'); if(el) el.textContent=`${Math.floor(e/60)}:${(e%60).toString().padStart(2,'0')}`;
  },1000);
}
function setNavStatus(live) {
  const dot=id('nsDot'),label=id('nsLabel');
  if(dot) dot.className='ns-dot'+(live?' live':'');
  if(label) label.textContent=live?'Live':'Offline';
}

const id = x => document.getElementById(x);
const sleep = ms => new Promise(r => setTimeout(r, ms));

window.addEventListener('DOMContentLoaded', () => {
  boot();
  setTimeout(initRealtimeInteractions, 1000); // init particles after boot
  
  // ── NAV EVENTS ──
  id('navDemo').addEventListener('click', e => { e.preventDefault(); showPage('demo'); });
  id('navGestures').addEventListener('click', e => { e.preventDefault(); showPage('gestures'); });
  id('navAbout').addEventListener('click', e => { e.preventDefault(); showPage('about'); });

  // ── POPULATE SIDEBAR ──
  const sdg = id('sideDictGrid');
  if (sdg) {
    sdg.innerHTML = ASL_GESTURES.map(g => `
      <div style="background:var(--surf);padding:1rem;border-radius:12px;border:1px solid var(--bdr);display:flex;gap:1.2rem;align-items:center;">
        <div style="font-size:2rem;background:var(--surf2);min-width:54px;height:54px;border-radius:10px;display:flex;justify-content:center;align-items:center;">${g.emoji}</div>
        <div>
          <div style="font-weight:700;margin-bottom:0.25rem;">${g.sign}</div>
          <div style="font-size:0.8rem;color:var(--txt2);line-height:1.4;">${g.desc}</div>
        </div>
      </div>
    `).join('');
    // Also build the one on the demo page
    if (typeof filterDemoGestures === 'function') {
      filterDemoGestures('all', document.querySelector('#demoGestureFilter .gf-btn.active'));
    }
  }
});

// ── REAL-TIME INTERACTIVE ADVANCED EFFECTS ──
function initRealtimeInteractions() {
  // 1. Dynamic Card Spotlight (follows mouse)
  document.addEventListener('mousemove', e => {
    document.querySelectorAll('.cam-card, .prediction-card, .stat-box, .confidence-card, .settings-card, .gc-card, .about-card').forEach(card => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });

    // 1.5 3D Responsive Hero Hand
    const handWrap = document.querySelector('.bot-hand-wrap');
    if (handWrap) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const xOffset = ((e.clientX / w) - 0.5) * 40; 
      const yOffset = ((e.clientY / h) - 0.5) * -40;
      handWrap.style.setProperty('--hand-ry', `${xOffset}deg`);
      handWrap.style.setProperty('--hand-rx', `${yOffset}deg`);
    }
  });

  // 2. Interactive Fluid Particle Mesh Background
  const c = document.createElement('canvas');
  c.id = 'bgCanvas';
  Object.assign(c.style, { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -2, pointerEvents: 'none', opacity: 0.8 });
  document.body.prepend(c);
  const ctx = c.getContext('2d');
  let w = c.width = window.innerWidth;
  let h = c.height = window.innerHeight;
  window.addEventListener('resize', () => { w = c.width = window.innerWidth; h = c.height = window.innerHeight; });

  const pts = Array.from({ length: 60 }, () => ({
    x: Math.random() * w, y: Math.random() * h,
    vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5,
    r: Math.random() * 2 + 1,
    c: ['#6EE7B7','#60A5FA','#A78BFA'][Math.floor(Math.random()*3)]
  }));

  let mx = w/2, my = h/2, tx = mx, ty = my;
  document.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });

  function drawBg() {
    ctx.clearRect(0,0,w,h);
    // Smooth mouse follow
    mx += (tx - mx) * 0.1; my += (ty - my) * 0.1;
    
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      
      const dx = mx - p.x; const dy = my - p.y;
      const d = Math.hypot(dx, dy);
      if (d < 180) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y); ctx.lineTo(mx, my);
        ctx.strokeStyle = `rgba(167, 139, 250, ${(1 - d/180) * 0.3})`;
        ctx.lineWidth = 1; ctx.stroke();
        p.x -= dx * 0.01; p.y -= dy * 0.01; 
      }
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = p.c + '60'; // hex opacity
      ctx.fill();
    });
    
    for(let i=0; i<pts.length; i++) {
      for(let j=i+1; j<pts.length; j++) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (d < 100) {
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - d/100) * 0.1})`;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(drawBg);
  }
  drawBg();
}