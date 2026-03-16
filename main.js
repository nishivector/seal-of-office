import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ─── Constants ───────────────────────────────────────────────────────────────
const W = window.innerWidth;
const H = window.innerHeight;
const STAMP_HITBOX = 80;
const STAMP_COOLDOWN = 220;
const DOC_W = 180;
const DOC_H = 240;
const DOUBLE_TAP_MS = 200;

// Level configs
const LEVELS = [
  { id:1, name:'Morning Pile',    minDocs:1, maxDocs:2, entryInterval:3200, minSpd:40, maxSpd:56, forgeries:0, totalDocs:12, depth:2 },
  { id:2, name:'Afternoon Rush',  minDocs:2, maxDocs:3, entryInterval:2600, minSpd:56, maxSpd:72, forgeries:0, totalDocs:14, depth:3 },
  { id:3, name:'Evening Chaos',   minDocs:3, maxDocs:4, entryInterval:2000, minSpd:64, maxSpd:88, forgeries:1, totalDocs:15, depth:4 },
  { id:4, name:'The Forgery',     minDocs:4, maxDocs:5, entryInterval:1800, minSpd:72, maxSpd:96, forgeries:2, totalDocs:16, depth:4 },
  { id:5, name:'The Coup',        minDocs:5, maxDocs:6, entryInterval:1400, minSpd:88, maxSpd:110, forgeries:3, totalDocs:18, depth:5 },
];

// ─── Three.js Setup ──────────────────────────────────────────────────────────
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(W, H);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xC8A96E);

// OrthographicCamera with 12° tilt (top-down)
const camera = new THREE.OrthographicCamera(-W/2, W/2, H/2, -H/2, 0.1, 1000);
camera.position.set(0, 10, 100);
camera.lookAt(0, 0, 0);

// Post-processing
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(W, H), 0.4, 0.4, 0.85);
composer.addPass(bloomPass);

// ─── Overlay 2D Canvas ───────────────────────────────────────────────────────
const ov = document.getElementById('overlay2d');
ov.width = W;
ov.height = H;
const ctx = ov.getContext('2d');

// ─── Game State ──────────────────────────────────────────────────────────────
let gameState = 'start'; // start | instructions | playing | gameover | levelcomplete
let score = 0;
let lives = 3;
let combo = 0;
let currentLevel = 0;
let hasEverActed = false;
let waveScore = 0;
let docsStampedCorrectly = 0;
let docsSpawned = 0;
let lastStampTime = 0;
let lastPointerX = W / 2;
let lastPointerY = H / 2;
let highScore = parseInt(localStorage.getItem('seal-of-office-highscore') || '0');

// Doc tracking
let documents = [];
let idleDocuments = []; // for start screen
let docIdCounter = 0;

// Double-tap tracking
let lastTapDocId = -1;
let lastTapTime = 0;

// Stamp state
let stampAnimating = false;
let stampDescend = 0; // 0=up, 1=descending, 2=hold, 3=rising

// Level scheduling
let nextDocTime = 0;
let forgeryCountLeft = 0;

// Start screen idle
let idleTime = 0;
let idleSlideDoc = null;
let idleSlideTimer = 0;
let idleWatermarkTimer = 0;
let idleWatermarkVisible = false;
let idleWatermarkOpacity = 0;

// ─── Tone.js Audio ───────────────────────────────────────────────────────────
let audioReady = false;
let woodblock, drone, prepPiano, strings, quillNoise, brassSynth;
let sfxStampValid, sfxClonk, sfxMiss, sfxCrumble, sfxSlideIn, sfxForgeryFlash, sfxTraitor, sfxLevelComplete;
let musicLoop = null;
let beatCount = 0;
let barCount = 0;
let inDanger = false;

function initAudio() {
  if (audioReady) return;
  try {
    Tone.start();
    const reverb01 = new Tone.Reverb({ decay: 0.5, wet: 0.1 }).toDestination();
    const reverb03 = new Tone.Reverb({ decay: 1.5, wet: 0.3 }).toDestination();

    // Woodblock
    woodblock = new Tone.MembraneSynth({
      pitchDecay: 0.05, octaves: 2,
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 }
    }).connect(reverb01);

    // Low drone
    drone = new Tone.AMSynth({
      harmonicity: 0.5,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.5, decay: 0.1, sustain: 0.8, release: 1 },
      volume: -18
    }).toDestination();

    // Prepared piano
    prepPiano = new Tone.MetalSynth({
      frequency: 200, envelope: { attack: 0.001, decay: 0.2, release: 0.1 },
      harmonicity: 5.1, modulationIndex: 32, resonance: 0.7, octaves: 1.5,
      volume: -20
    }).connect(reverb03);

    // High strings
    strings = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.4, decay: 0.2, sustain: 0.6, release: 1 },
      volume: -22
    }).toDestination();

    // Quill noise (ambient)
    quillNoise = new Tone.Noise('brown');
    quillNoise.volume.value = -28;
    quillNoise.toDestination();

    // Brass
    brassSynth = new Tone.Synth({
      oscillator: { type: 'sine' },
      portamento: 0.2,
      envelope: { attack: 0.4, decay: 0.1, sustain: 0.7, release: 0.5 },
      volume: -24
    }).toDestination();

    // SFX
    sfxStampValid = new Tone.MembraneSynth({
      pitchDecay: 0.3, octaves: 3,
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 }
    }).connect(reverb01);

    sfxClonk = new Tone.MetalSynth({
      frequency: 200, envelope: { attack: 0.001, decay: 0.5, release: 0.2 },
      harmonicity: 5.1, modulationIndex: 32, resonance: 0.9, octaves: 1.5,
      volume: -12
    }).connect(reverb03);

    sfxMiss = new Tone.Noise('pink');
    sfxMiss.volume.value = -20;
    const missDur = new Tone.AmplitudeEnvelope({ attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 }).toDestination();
    sfxMiss.connect(missDur);

    sfxCrumble = new Tone.Noise('brown');
    sfxCrumble.volume.value = -16;
    const crumbleFilter = new Tone.AutoFilter({ frequency: 2, baseFrequency: 800, octaves: 3 }).toDestination().start();
    sfxCrumble.connect(crumbleFilter);

    sfxSlideIn = new Tone.Noise('white');
    sfxSlideIn.volume.value = -24;
    const slideEnv = new Tone.AmplitudeEnvelope({ attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 }).toDestination();
    sfxSlideIn.connect(slideEnv);

    sfxForgeryFlash = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 },
      volume: -16
    }).toDestination();

    sfxTraitor = new Tone.AMSynth({
      harmonicity: 0.5,
      envelope: { attack: 0.001, decay: 0.8, sustain: 0.2, release: 0.5 },
      portamento: 0.8,
      volume: -12
    }).toDestination();

    sfxLevelComplete = new Tone.MetalSynth({
      frequency: 600, envelope: { attack: 0.001, decay: 0.4, release: 0.2 },
      harmonicity: 5.1, modulationIndex: 32, resonance: 0.8, octaves: 2,
      volume: -14
    }).connect(reverb03);

    audioReady = true;
    quillNoise.start();
    startMusicLoop();
  } catch(e) {
    // Audio init failed silently
  }
}

function startMusicLoop() {
  if (!audioReady) return;
  beatCount = 0;
  barCount = 0;
  const bpm = gameState === 'start' ? 46 : 92;
  Tone.Transport.bpm.value = bpm;
  const beatDur = 60 / bpm;

  if (musicLoop) { musicLoop.dispose(); musicLoop = null; }
  try { drone.triggerAttack('C1', Tone.now()); } catch(e) {}

  musicLoop = new Tone.Sequence((time) => {
    beatCount++;
    const beat = ((beatCount - 1) % 4) + 1;
    const bar = Math.floor((beatCount - 1) / 4) + 1;
    if (bar > barCount) barCount = bar;

    // Woodblock on beats 2 and 4
    if (beat === 2 || beat === 4) {
      const delay = (inDanger && beat === 4) ? 0.04 : 0;
      try { woodblock.triggerAttackRelease('C2', '16n', time + delay); } catch(e) {}
    }
    // Prepared piano: beat 3 of bar 2 and 4 (after 4 bars)
    if (barCount >= 4 && beat === 3 && (bar % 2 === 0)) {
      if (!inDanger) {
        try { prepPiano.triggerAttackRelease('16n', time); } catch(e) {}
      }
    }
    // Strings from level 3+
    if (currentLevel >= 2 && (beat === 1 || beat === 3)) {
      try { strings.triggerAttackRelease(['C4','E4','G4'], '8n', time); } catch(e) {}
    }
    // Danger brass
    if (inDanger && beat === 1) {
      try { brassSynth.triggerAttackRelease('C2', '4n', time); } catch(e) {}
    }
  }, ['0:0','0:1','0:2','0:3'], '4n');

  musicLoop.start(0);
  Tone.Transport.start();
}

function playStampSfx(centered) {
  if (!audioReady) return;
  try { sfxStampValid.triggerAttackRelease(centered ? '80hz' : '60hz', '16n'); } catch(e) {}
}
function playClonk() {
  if (!audioReady) return;
  try { sfxClonk.triggerAttackRelease('16n'); } catch(e) {}
}
function playMiss() {
  if (!audioReady) return;
  try {
    sfxMiss.start();
    Tone.Transport.scheduleOnce(() => { try { sfxMiss.stop(); } catch(e) {} }, '+0.08');
  } catch(e) {}
}
function playCrumble() {
  if (!audioReady) return;
  try {
    sfxCrumble.start();
    Tone.Transport.scheduleOnce(() => { try { sfxCrumble.stop(); } catch(e) {} }, '+0.4');
  } catch(e) {}
}
function playSlideIn() {
  if (!audioReady) return;
  try {
    sfxSlideIn.start();
    Tone.Transport.scheduleOnce(() => { try { sfxSlideIn.stop(); } catch(e) {} }, '+0.15');
  } catch(e) {}
}
function playForgeryFlash() {
  if (!audioReady) return;
  try { sfxForgeryFlash.triggerAttackRelease(880, '16n'); } catch(e) {}
}
function playTraitor() {
  if (!audioReady) return;
  try { sfxTraitor.triggerAttackRelease('A3', '2n'); } catch(e) {}
}
function playLevelComplete() {
  if (!audioReady) return;
  const t = Tone.now();
  try {
    woodblock.triggerAttackRelease('C2','16n', t);
    woodblock.triggerAttackRelease('C2','16n', t+0.15);
    woodblock.triggerAttackRelease('C2','16n', t+0.3);
    woodblock.triggerAttackRelease('C2','16n', t+0.45);
    sfxLevelComplete.triggerAttackRelease('16n', t+0.5);
  } catch(e) {}
}

// ─── THREE.js Scene Objects ──────────────────────────────────────────────────

// Desk surface (background plane)
const deskGeo = new THREE.PlaneGeometry(W, H);
const deskMat = new THREE.MeshBasicMaterial({ color: 0xC8A96E });
const deskMesh = new THREE.Mesh(deskGeo, deskMat);
deskMesh.position.z = -1;
scene.add(deskMesh);

// Wood grain texture on overlay2d (drawn each frame)

// ─── Stamp cursor object ─────────────────────────────────────────────────────
const stampGroup = new THREE.Group();
// Handle
const handleGeo = new THREE.BoxGeometry(30, 60, 10);
const handleMat = new THREE.MeshBasicMaterial({ color: 0x8B6914 });
const handleMesh = new THREE.Mesh(handleGeo, handleMat);
handleMesh.position.y = 30;
stampGroup.add(handleMesh);
// Base
const baseGeo = new THREE.BoxGeometry(STAMP_HITBOX, 20, 10);
const baseMat = new THREE.MeshBasicMaterial({ color: 0xC8102E });
const baseMesh = new THREE.Mesh(baseGeo, baseMat);
baseMesh.position.y = -10;
stampGroup.add(baseMesh);
// Ink circle
const inkGeo = new THREE.CircleGeometry(28, 16);
const inkMat = new THREE.MeshBasicMaterial({ color: 0x8B0000 });
const inkCircle = new THREE.Mesh(inkGeo, inkMat);
inkCircle.position.y = -20;
stampGroup.add(inkCircle);

stampGroup.position.set(0, 0, 5);
stampGroup.visible = false;
scene.add(stampGroup);

// Idle scene objects
const idleGroup = new THREE.Group();
scene.add(idleGroup);

// Stamp holder (idle)
const holderGeo = new THREE.BoxGeometry(20, 70, 10);
const holderMat = new THREE.MeshBasicMaterial({ color: 0xB8941E });
const holderMesh = new THREE.Mesh(holderGeo, holderMat);
holderMesh.position.set(-W * 0.3, 0, 2);
idleGroup.add(holderMesh);

// Inkwell (idle, top-right)
const inkwellGeo = new THREE.CircleGeometry(20, 16);
const inkwellMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
const inkwellMesh = new THREE.Mesh(inkwellGeo, inkwellMat);
inkwellMesh.position.set(W * 0.35, H * 0.35, 2);
idleGroup.add(inkwellMesh);

// Quill pen (idle)
const quillGeo = new THREE.BoxGeometry(8, 120, 4);
const quillMat = new THREE.MeshBasicMaterial({ color: 0xD4A800 });
const quillMesh = new THREE.Mesh(quillGeo, quillMat);
quillMesh.position.set(-W * 0.35, -H * 0.3, 2);
quillMesh.rotation.z = Math.PI / 5;
idleGroup.add(quillMesh);

// Document pile (idle) — 5 docs
const idleDocGroup = new THREE.Group();
for (let i = 0; i < 5; i++) {
  const dg = new THREE.PlaneGeometry(DOC_W, DOC_H);
  const dm = new THREE.MeshBasicMaterial({
    color: 0xF2E8D5,
    transparent: true,
    opacity: 0.85 + 0.03 * i
  });
  const d = new THREE.Mesh(dg, dm);
  d.position.set(i * 6 - 12, i * 3 - 6, i * 0.1);
  idleDocGroup.add(d);
}
idleDocGroup.position.set(0, 0, 2);
idleGroup.add(idleDocGroup);

// ─── Document system ─────────────────────────────────────────────────────────
function createDocMesh(isForgery) {
  const group = new THREE.Group();
  // Paper
  const pg = new THREE.PlaneGeometry(DOC_W, DOC_H);
  const pm = new THREE.MeshBasicMaterial({ color: 0xF2E8D5 });
  const paper = new THREE.Mesh(pg, pm);
  group.add(paper);

  // Text lines (3-4 horizontal)
  const lineCount = 3 + Math.floor(Math.random() * 2);
  for (let i = 0; i < lineCount; i++) {
    const lg = new THREE.PlaneGeometry(DOC_W * 0.7 * (0.6 + Math.random() * 0.4), 4);
    const lm = new THREE.MeshBasicMaterial({ color: 0x1A3A5C, transparent: true, opacity: 0.3 });
    const line = new THREE.Mesh(lg, lm);
    line.position.set(-DOC_W * 0.1 + Math.random() * 20 - 10, 60 - i * 30, 0.1);
    group.add(line);
  }

  // Watermark (eagle shape simplified as rotated rectangle + lines)
  const wg = new THREE.PlaneGeometry(60, 50);
  const wm = new THREE.MeshBasicMaterial({
    color: isForgery ? 0xD64E2A : 0x1A3A5C,
    transparent: true,
    opacity: isForgery ? 0.3 : 0.08
  });
  const watermark = new THREE.Mesh(wg, wm);
  watermark.position.set(30, -20, 0.2);
  // Mirror for forgery (face left)
  if (isForgery) watermark.scale.x = -1;
  watermark.userData.isWatermark = true;
  group.add(watermark);

  // Eagle body detail for watermark
  const eagleBodyGeo = new THREE.CircleGeometry(10, 8);
  const eagleBodyMat = new THREE.MeshBasicMaterial({
    color: isForgery ? 0xD64E2A : 0x1A3A5C,
    transparent: true,
    opacity: isForgery ? 0.35 : 0.1
  });
  const eagleBody = new THREE.Mesh(eagleBodyGeo, eagleBodyMat);
  eagleBody.position.set(30, -20, 0.3);
  group.add(eagleBody);

  // Drop shadow
  const sg = new THREE.PlaneGeometry(DOC_W + 6, DOC_H + 6);
  const sm = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 });
  const shadow = new THREE.Mesh(sg, sm);
  shadow.position.set(3, -3, -0.1);
  group.add(shadow);

  return group;
}

function spawnDocument(x, y, speed, isForgery, fromTop) {
  const mesh = createDocMesh(isForgery);
  mesh.position.set(x, y, 3 + documents.length * 0.1);

  // Drift direction
  const angle = fromTop
    ? (Math.PI * 1.1 + Math.random() * 0.2) // downward-left
    : (Math.PI + Math.random() * 0.3 - 0.15); // leftward

  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;

  scene.add(mesh);
  playSlideIn();

  const doc = {
    id: docIdCounter++,
    mesh,
    x, y,
    vx, vy,
    isForgery,
    stamped: false,
    rejected: false,
    crumbled: false,
    alive: true,
    watermarkVisible: isForgery,
    watermarkTimer: 0.8,
    waxSealMesh: null,
    stampEffect: null,
    fromTop
  };

  if (isForgery) playForgeryFlash();
  documents.push(doc);
  return doc;
}

function addWaxSeal(doc) {
  const sg = new THREE.CircleGeometry(32, 24);
  const sm = new THREE.MeshBasicMaterial({ color: 0xC8102E, transparent: true, opacity: 0.85 });
  const seal = new THREE.Mesh(sg, sm);
  seal.position.set(0, 0, 0.5);
  doc.mesh.add(seal);
  doc.waxSealMesh = seal;
}

// ─── Overlay 2D rendering ────────────────────────────────────────────────────
function drawWoodGrain() {
  ctx.clearRect(0, 0, W, H);
  // Subtle wood grain lines
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.strokeStyle = '#5A3010';
  ctx.lineWidth = 1;
  for (let i = 0; i < 40; i++) {
    const x = (i / 40) * W + Math.sin(i * 0.5) * 20;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + 10, H * 0.3, x - 10, H * 0.6, x + 5, H);
    ctx.stroke();
  }
  ctx.restore();
}

function drawIdleWatermark(opacity) {
  if (opacity <= 0) return;
  ctx.save();
  ctx.globalAlpha = opacity * 0.15;
  ctx.fillStyle = '#D64E2A';
  ctx.font = 'bold 40px Georgia';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(W / 2, H / 2);
  ctx.scale(-1, 1);
  ctx.fillText('FORGED', 0, 0);
  ctx.restore();
}

// ─── Game Logic ──────────────────────────────────────────────────────────────
function startLevel(levelIdx) {
  currentLevel = levelIdx;
  documents.forEach(d => scene.remove(d.mesh));
  documents = [];
  docIdCounter = 0;
  docsSpawned = 0;
  docsStampedCorrectly = 0;
  waveScore = 0;
  hasEverActed = false;
  inDanger = false;
  const cfg = LEVELS[currentLevel];
  forgeryCountLeft = cfg.forgeries;
  nextDocTime = performance.now() + 500;
  updateHUD();
  document.getElementById('hud-level').textContent = `Level ${cfg.id}: ${cfg.name}`;
}

function resetGame() {
  score = 0;
  lives = 3;
  combo = 0;
  currentLevel = 0;
  hasEverActed = false;
  documents.forEach(d => scene.remove(d.mesh));
  documents = [];
}

function showInstructions() {
  document.getElementById('start-screen').style.display = 'none';
  const is = document.getElementById('instructions-screen');
  is.classList.add('visible');
  gameState = 'instructions';
}

function startGame() {
  document.getElementById('instructions-screen').classList.remove('visible');
  document.getElementById('hud').classList.add('visible');
  stampGroup.visible = true;
  idleGroup.visible = false;
  gameState = 'playing';
  resetGame();
  startLevel(0);
  if (audioReady) {
    Tone.Transport.bpm.value = 92;
    startMusicLoop();
  }
}

function gameOver() {
  if (gameState !== 'playing') return;
  gameState = 'gameover';
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('seal-of-office-highscore', highScore);
  }
  document.getElementById('go-score').textContent = score;
  document.getElementById('go-highscore').textContent = highScore;
  document.getElementById('gameover-screen').classList.add('visible');
  document.getElementById('hud').classList.remove('visible');
  stampGroup.visible = false;
  if (audioReady) {
    if (musicLoop) { musicLoop.stop(); }
    Tone.Transport.stop();
    try {
      drone.triggerAttackRelease('C1', '2.5s');
    } catch(e) {}
  }
}

function levelComplete() {
  if (gameState !== 'playing') return;
  gameState = 'levelcomplete';
  playLevelComplete();
  document.getElementById('lc-score').textContent = score;
  document.getElementById('levelcomplete-screen').classList.add('visible');
  stampGroup.visible = false;
}

function nextLevel() {
  document.getElementById('levelcomplete-screen').classList.remove('visible');
  if (currentLevel + 1 >= LEVELS.length) {
    // Victory — treat as game over with great score
    gameOver();
    return;
  }
  stampGroup.visible = true;
  gameState = 'playing';
  startLevel(currentLevel + 1);
}

function triggerTraitor() {
  playTraitor();
  score = Math.max(0, score - Math.abs(waveScore));
  waveScore = 0;
  combo = 0;
  showBanner('TRAITOR');
  updateHUD();
  // Level restarts after banner
  gameState = 'paused_traitor';
  traitorTimer = 2000;
}

let traitorTimer = 0;

function showBanner(text) {
  const b = document.getElementById('traitor-banner');
  b.textContent = text;
  b.style.display = 'block';
}
function hideBanner() {
  document.getElementById('traitor-banner').style.display = 'none';
}

function updateHUD() {
  document.getElementById('hud-score').textContent = score;
  const livesStr = '♦'.repeat(Math.max(0, lives)) + '◇'.repeat(Math.max(0, 3 - lives));
  document.getElementById('hud-lives').textContent = livesStr;
  const comboEl = document.getElementById('hud-combo');
  if (combo >= 4) {
    const mult = combo >= 8 ? '×3' : '×2';
    comboEl.textContent = `COMBO ${mult}`;
  } else {
    comboEl.textContent = '';
  }
}

function getMultiplier() {
  if (combo >= 8) return 3;
  if (combo >= 4) return 2;
  return 1;
}

function showFloatScore(pts, x, y) {
  const el = document.getElementById('float-score');
  el.textContent = (pts > 0 ? '+' : '') + pts;
  el.style.color = pts > 0 ? '#1A3A5C' : '#8B1A1A';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.style.display = 'block';
  el.style.opacity = '1';
  el.style.transform = 'translateY(0)';
  el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
  requestAnimationFrame(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-40px)';
  });
  const cleanup = () => { el.style.display = 'none'; el.style.transition = 'none'; };
  el.addEventListener('transitionend', cleanup, { once: true });
}

// ─── Pointer handling ────────────────────────────────────────────────────────
const rect = () => canvas.getBoundingClientRect();

function pointerToWorld(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const nx = clientX - r.left;
  const ny = clientY - r.top;
  // Map to world coords (orthographic)
  const wx = (nx / r.width) * W - W / 2;
  const wy = -(ny / r.height) * H + H / 2;
  return { wx, wy, sx: nx, sy: ny };
}

canvas.addEventListener('pointermove', (e) => {
  e.preventDefault();
  const { wx, wy } = pointerToWorld(e.clientX, e.clientY);
  lastPointerX = wx;
  lastPointerY = wy;
  if (gameState === 'playing') {
    stampGroup.position.set(wx, wy, 5);
  }
}, { passive: false });

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (gameState === 'start') {
    showInstructions();
    initAudio();
    return;
  }
  if (gameState === 'instructions') return;
  if (gameState !== 'playing') return;

  const { wx, wy, sx, sy } = pointerToWorld(e.clientX, e.clientY);
  hasEverActed = true;

  const now = performance.now();
  if (now - lastStampTime < STAMP_COOLDOWN) return;

  // Find topmost doc under cursor
  const hitDoc = getDocAtWorld(wx, wy);

  // Double-tap detection
  if (hitDoc && now - lastTapTime < DOUBLE_TAP_MS && lastTapDocId === hitDoc.id) {
    // REJECT action
    handleReject(hitDoc, sx, sy);
    lastTapDocId = -1;
    lastTapTime = 0;
    return;
  }

  lastTapDocId = hitDoc ? hitDoc.id : -1;
  lastTapTime = now;
  lastStampTime = now;

  // Animate stamp
  animateStamp();

  if (!hitDoc) {
    playMiss();
    return;
  }

  // Check overlap (60%)
  const overlap = getOverlap(wx, wy, hitDoc);
  if (overlap < 0.6) {
    playMiss();
    return;
  }

  handleStamp(hitDoc, wx, wy, sx, sy);
}, { passive: false });

function getDocAtWorld(wx, wy) {
  // Find topmost (highest z) document whose rect contains the cursor
  let best = null;
  let bestZ = -Infinity;
  for (const doc of documents) {
    if (!doc.alive || doc.stamped || doc.crumbled) continue;
    const dx = Math.abs(wx - doc.x);
    const dy = Math.abs(wy - doc.y);
    if (dx <= DOC_W / 2 && dy <= DOC_H / 2) {
      if (doc.mesh.position.z > bestZ) {
        best = doc;
        bestZ = doc.mesh.position.z;
      }
    }
  }
  return best;
}

function getOverlap(wx, wy, doc) {
  const sx1 = wx - STAMP_HITBOX / 2, sy1 = wy - STAMP_HITBOX / 2;
  const sx2 = wx + STAMP_HITBOX / 2, sy2 = wy + STAMP_HITBOX / 2;
  const dx1 = doc.x - DOC_W / 2, dy1 = doc.y - DOC_H / 2;
  const dx2 = doc.x + DOC_W / 2, dy2 = doc.y + DOC_H / 2;
  const ox = Math.max(0, Math.min(sx2, dx2) - Math.max(sx1, dx1));
  const oy = Math.max(0, Math.min(sy2, dy2) - Math.max(sy1, dy1));
  const interArea = ox * oy;
  const stampArea = STAMP_HITBOX * STAMP_HITBOX;
  return interArea / stampArea;
}

function handleStamp(doc, wx, wy, sx, sy) {
  if (doc.isForgery) {
    // TRAITOR
    doc.stamped = true;
    addWaxSeal(doc);
    combo = 0;
    triggerTraitor();
    updateHUD();
    return;
  }
  // Valid stamp
  doc.stamped = true;
  addWaxSeal(doc);
  const centered = Math.abs(wx - doc.x) < 20 && Math.abs(wy - doc.y) < 20;
  const pts = (centered ? 100 : 50) * getMultiplier();
  score += pts;
  waveScore += pts;
  docsStampedCorrectly++;
  combo++;
  playStampSfx(centered);
  showFloatScore(pts, sx, sy);
  updateHUD();
  checkLevelWin();
}

function handleReject(doc, sx, sy) {
  if (!doc.isForgery) {
    // Wrong reject — penalty
    const pts = -300;
    score = Math.max(0, score + pts);
    lives--;
    combo = 0;
    playClonk();
    showFloatScore(pts, sx, sy);
    updateHUD();
    if (lives <= 0) {
      gameOver();
      return;
    }
    return;
  }
  // Correct reject
  doc.rejected = true;
  doc.alive = false;
  scene.remove(doc.mesh);
  const pts = 500 * getMultiplier();
  score += pts;
  waveScore += pts;
  combo++;
  docsStampedCorrectly++;
  playClonk();
  showFloatScore(pts, sx, sy);
  updateHUD();
  checkLevelWin();
}

function checkLevelWin() {
  if (!hasEverActed) return;
  const cfg = LEVELS[currentLevel];
  if (docsStampedCorrectly >= 10 && docsSpawned >= cfg.totalDocs) {
    levelComplete();
  }
}

function animateStamp() {
  if (stampAnimating) return;
  stampAnimating = true;
  const startY = stampGroup.position.y;
  const t0 = performance.now();
  function anim(now) {
    const elapsed = now - t0;
    if (elapsed < 60) {
      stampGroup.children[0].position.y = 30 - 20 * (elapsed / 60);
    } else if (elapsed < 80) {
      // hold
    } else if (elapsed < 160) {
      stampGroup.children[0].position.y = 10 + 20 * ((elapsed - 80) / 80);
    } else {
      stampGroup.children[0].position.y = 30;
      stampAnimating = false;
      return;
    }
    requestAnimationFrame(anim);
  }
  requestAnimationFrame(anim);
}

// Document-level / gameover event handlers
document.addEventListener('pointerdown', (e) => {
  if (gameState === 'gameover') {
    document.getElementById('gameover-screen').classList.remove('visible');
    document.getElementById('hud').classList.add('visible');
    stampGroup.visible = true;
    gameState = 'playing';
    resetGame();
    startLevel(0);
    if (audioReady) startMusicLoop();
  } else if (gameState === 'levelcomplete') {
    nextLevel();
  }
}, true);

// ─── Spawning logic ───────────────────────────────────────────────────────────
function trySpawnDoc(now) {
  const cfg = LEVELS[currentLevel];
  if (docsSpawned >= cfg.totalDocs) return;
  if (now < nextDocTime) return;

  // How many on screen?
  const alive = documents.filter(d => d.alive).length;
  const maxActive = cfg.minDocs + Math.floor(Math.random() * (cfg.maxDocs - cfg.minDocs + 1));
  if (alive >= maxActive) return;

  const speed = cfg.minSpd + Math.random() * (cfg.maxSpd - cfg.minSpd);
  let isForgery = false;

  // Decide forgery
  const remainingDocs = cfg.totalDocs - docsSpawned;
  const forgeryProb = forgeryCountLeft / remainingDocs;
  if (forgeryCountLeft > 0 && Math.random() < forgeryProb) {
    isForgery = true;
    forgeryCountLeft--;
  }

  let sx, sy, fromTop = false;
  if (currentLevel === 4 && Math.random() < 0.4) {
    // L5: enter from top
    fromTop = true;
    sx = -W * 0.3 + Math.random() * W * 0.6;
    sy = H / 2 + DOC_H;
  } else {
    // Enter from right side
    sx = W / 2 + DOC_W;
    sy = -H * 0.3 + Math.random() * H * 0.6;
  }

  spawnDocument(sx, sy, speed, isForgery, fromTop);
  docsSpawned++;
  nextDocTime = now + cfg.entryInterval + (Math.random() - 0.5) * 400;
}

// ─── Main animation loop ─────────────────────────────────────────────────────
let lastFrameTime = performance.now();

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastFrameTime) / 1000, 0.1);
  lastFrameTime = now;

  ctx.clearRect(0, 0, W, H);
  drawWoodGrain();

  if (gameState === 'start') {
    updateIdleScene(now, dt);
  } else if (gameState === 'playing' || gameState === 'paused_traitor') {
    updateGameScene(now, dt);
  }

  if (gameState === 'paused_traitor') {
    traitorTimer -= dt * 1000;
    if (traitorTimer <= 0) {
      hideBanner();
      documents.forEach(d => scene.remove(d.mesh));
      documents = [];
      gameState = 'playing';
      startLevel(currentLevel);
    }
  }

  composer.render();
}

// ─── Idle scene update ────────────────────────────────────────────────────────
function updateIdleScene(now, dt) {
  // documentPile breathe: scale 1.0→1.02→1.0, 4s period
  const breathe = 1 + 0.02 * Math.sin(now / 1000 * (Math.PI * 2 / 4));
  idleDocGroup.scale.set(breathe, breathe, 1);

  // stampHolder pendulum ±1.2°, 3.5s period
  holderMesh.rotation.z = (1.2 * Math.PI / 180) * Math.sin(now / 1000 * (Math.PI * 2 / 3.5));

  // Sliding doc timer
  idleSlideTimer -= dt;
  if (idleSlideTimer <= 0) {
    idleSlideTimer = 7;
    // Spawn sliding doc
    idleSlideDoc = {
      x: -W / 2 - DOC_W / 2,
      y: 20 + Math.random() * 60 - 30,
      done: false
    };
  }

  if (idleSlideDoc && !idleSlideDoc.done) {
    idleSlideDoc.x += 80 * dt;
    if (idleSlideDoc.x > W / 2 + DOC_W) {
      idleSlideDoc.done = true;
      idleSlideDoc = null;
    }
  }

  // Watermark flash timer
  idleWatermarkTimer -= dt;
  if (idleWatermarkTimer <= 0) {
    idleWatermarkTimer = 14;
    idleWatermarkVisible = true;
    idleWatermarkOpacity = 1;
  }
  if (idleWatermarkVisible) {
    idleWatermarkOpacity -= dt / 0.8;
    if (idleWatermarkOpacity <= 0) {
      idleWatermarkOpacity = 0;
      idleWatermarkVisible = false;
    }
    drawIdleWatermark(idleWatermarkOpacity);
  }

  // Draw sliding doc on 2D overlay
  if (idleSlideDoc && !idleSlideDoc.done) {
    ctx.save();
    ctx.fillStyle = '#F2E8D5';
    ctx.strokeStyle = '#1A3A5C';
    ctx.lineWidth = 1;
    const sx = idleSlideDoc.x + W / 2 - DOC_W / 2;
    const sy = H / 2 - idleSlideDoc.y - DOC_H / 2;
    ctx.fillRect(sx, sy, DOC_W, DOC_H);
    ctx.strokeRect(sx, sy, DOC_W, DOC_H);
    ctx.restore();
  }

  idleTime = now;
}

// ─── Game scene update ────────────────────────────────────────────────────────
function updateGameScene(now, dt) {
  if (gameState === 'playing') trySpawnDoc(now);

  // Update documents
  let docsNearEdge = 0;
  let allSpawnedDone = docsSpawned >= LEVELS[currentLevel].totalDocs;

  for (let i = documents.length - 1; i >= 0; i--) {
    const doc = documents[i];
    if (!doc.alive) continue;

    // Update watermark visibility for forgeries
    if (doc.isForgery && doc.watermarkVisible && !doc.stamped) {
      doc.watermarkTimer -= dt;
      if (doc.watermarkTimer <= 0) {
        doc.watermarkVisible = false;
        // Hide watermark meshes
        doc.mesh.children.forEach(c => {
          if (c.userData.isWatermark) {
            c.material.opacity = 0.03;
          }
        });
      }
    }

    if (!doc.stamped) {
      doc.x += doc.vx * dt;
      doc.y += doc.vy * dt;
      doc.mesh.position.set(doc.x, doc.y, doc.mesh.position.z);
    }

    // Check if near edge (crumble zone)
    const edgeX = doc.x < -W / 2 - 30;
    const edgeY = doc.y < -H / 2 - 30;
    const edgeXR = doc.x > W / 2 + 30;
    const edgeYT = doc.y > H / 2 + 30;

    if (edgeX || edgeY || edgeXR || edgeYT) {
      doc.alive = false;
      scene.remove(doc.mesh);
      documents.splice(i, 1);

      if (!doc.stamped && !doc.rejected) {
        if (doc.isForgery) {
          // Forgery avoided correctly
          const pts = 200 * getMultiplier();
          score += pts;
          waveScore += pts;
          combo++;
          docsStampedCorrectly++;
          showFloatScore(pts, W * 0.75, H * 0.5);
          updateHUD();
          checkLevelWin();
        } else {
          // Valid doc crumbled — penalty
          if (hasEverActed) {
            const pts = -75;
            score = Math.max(0, score + pts);
            lives--;
            combo = 0;
            playCrumble();
            showFloatScore(pts, W * 0.25, H * 0.5);
            updateHUD();
            const isLevel5 = currentLevel === 4;
            if (lives <= 0 || (isLevel5 && lives < 3)) {
              if (isLevel5) lives = 0;
              if (lives <= 0) gameOver();
            }
          }
        }
      }
      continue;
    }

    // Check proximity to edge for danger state
    if (doc.x < -W * 0.35 || doc.y < -H * 0.35) docsNearEdge++;
  }

  // Update danger state
  const wasDanger = inDanger;
  inDanger = docsNearEdge >= 3;
  if (inDanger !== wasDanger && audioReady) {
    if (inDanger) {
      try { brassSynth.triggerAttack('C2'); } catch(e) {}
    } else {
      try { brassSynth.triggerRelease(); } catch(e) {}
    }
  }

  // Win check: all docs spawned and done
  if (allSpawnedDone && documents.filter(d => d.alive).length === 0 && hasEverActed && gameState === 'playing') {
    const cfg = LEVELS[currentLevel];
    if (docsStampedCorrectly >= 10) {
      levelComplete();
    } else if (lives > 0) {
      // Not enough correct — level failed
      lives--;
      updateHUD();
      if (lives <= 0) { gameOver(); return; }
      // Restart level
      documents.forEach(d => scene.remove(d.mesh));
      documents = [];
      startLevel(currentLevel);
    }
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
idleSlideTimer = 7;
idleWatermarkTimer = 14;

// SVG title opacity pulse (CSS animation)
const svgTitle = document.getElementById('svg-title');
if (svgTitle) {
  let titleT = 0;
  function pulseSVG(now) {
    titleT = now / 1000;
    const opc = 0.85 + 0.15 * (0.5 + 0.5 * Math.sin(titleT * (Math.PI * 2 / 3.2)));
    svgTitle.setAttribute('opacity', opc.toFixed(3));
    requestAnimationFrame(pulseSVG);
  }
  requestAnimationFrame(pulseSVG);
}

// Letter spacing reveal animation
if (svgTitle) {
  svgTitle.setAttribute('letter-spacing', '2');
  let lsAnim = 0;
  function revealLS(now) {
    lsAnim = Math.min(lsAnim + 0.02, 1);
    const ls = 2 + 8 * lsAnim;
    svgTitle.setAttribute('letter-spacing', ls.toFixed(1));
    if (lsAnim < 1) requestAnimationFrame(revealLS);
  }
  requestAnimationFrame(revealLS);
}

requestAnimationFrame(animate);
