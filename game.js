// ============================================================================
// CHROME HILL ZONE - ACT 1
// NANO BANANA HD PIXEL-ART ENGINE + ANIMATED FUNNY ROBOT ("GIZMO-BOT")
// ============================================================================

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const W = canvas.width;
const H = canvas.height;
const LEVEL_LENGTH = 9400;

// ----------------------------------------------------------------------------
// NANO BANANA HD SPRITE & BACKGROUND ASSET LOADER
// ----------------------------------------------------------------------------
const sprites = {};
let assetsReady = false;

function loadNanoBananaAssets() {
  if (!window.NANO_ASSETS) return;
  const assetKeys = Object.keys(window.NANO_ASSETS);
  let loadedCount = 0;

  assetKeys.forEach((key) => {
    const img = new Image();
    img.onload = () => {
      loadedCount++;
      if (loadedCount === assetKeys.length) {
        assetsReady = true;
      }
    };
    img.src = window.NANO_ASSETS[key];
    sprites[key] = img;
  });
}

loadNanoBananaAssets();

// ----------------------------------------------------------------------------
// INPUT CONTROLLER
// ----------------------------------------------------------------------------
const keys = {
  left: false,
  right: false,
  down: false,
  jump: false,
  jumpJustPressed: false
};

window.addEventListener('keydown', (e) => {
  window.soundEngine.init();
  window.soundEngine.startMusic();

  const code = e.code;
  if (code === 'ArrowLeft' || code === 'KeyA') keys.left = true;
  if (code === 'ArrowRight' || code === 'KeyD') keys.right = true;
  if (code === 'ArrowDown' || code === 'KeyS') keys.down = true;
  if (code === 'Space' || code === 'KeyZ' || code === 'KeyW' || code === 'ArrowUp') {
    if (!keys.jump) keys.jumpJustPressed = true;
    keys.jump = true;
    e.preventDefault();
  }
  if (code === 'KeyR') {
    initLevel(false);
  }
});

window.addEventListener('keyup', (e) => {
  const code = e.code;
  if (code === 'ArrowLeft' || code === 'KeyA') keys.left = false;
  if (code === 'ArrowRight' || code === 'KeyD') keys.right = false;
  if (code === 'ArrowDown' || code === 'KeyS') keys.down = false;
  if (code === 'Space' || code === 'KeyZ' || code === 'KeyW' || code === 'ArrowUp') {
    keys.jump = false;
  }
});

document.getElementById('mute-btn').addEventListener('click', (e) => {
  const muted = window.soundEngine.toggleMute();
  e.target.textContent = muted ? '🔇 SYNTH: OFF' : '🔊 SYNTH: ON';
});

const restartBtn = document.getElementById('restart-btn');
if (restartBtn) {
  restartBtn.addEventListener('click', () => {
    window.soundEngine.init();
    initLevel(false);
  });
}

// ----------------------------------------------------------------------------
// iOS / MOBILE MULTI-TOUCH GAMEPAD CONTROLLER
// ----------------------------------------------------------------------------
function setupTouchControls() {
  const unlockAudio = () => {
    window.soundEngine.init();
    window.soundEngine.startMusic();
  };

  window.addEventListener('touchstart', unlockAudio, { passive: true, once: true });

  const bindHoldButton = (btnId, keyName, onPress) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    const press = (e) => {
      if (e.cancelable) e.preventDefault();
      unlockAudio();
      keys[keyName] = true;
      btn.classList.add('pressed');
      if (onPress) onPress();
    };

    const release = (e) => {
      if (e && e.cancelable) e.preventDefault();
      keys[keyName] = false;
      btn.classList.remove('pressed');
    };

    btn.addEventListener('touchstart', press, { passive: false });
    btn.addEventListener('touchend', release, { passive: false });
    btn.addEventListener('touchcancel', release, { passive: false });
    btn.addEventListener('mousedown', press);
    btn.addEventListener('mouseup', release);
    btn.addEventListener('mouseleave', release);
  };

  bindHoldButton('btn-left', 'left');
  bindHoldButton('btn-right', 'right');
  bindHoldButton('btn-down', 'down');
  bindHoldButton('btn-jump', 'jump', () => {
    keys.jumpJustPressed = true;
  });

  // One-thumb Spin-Dash button: holds Down + revs Spin Dash on tap, releases on lift!
  const spinBtn = document.getElementById('btn-spindash');
  if (spinBtn) {
    const startSpin = (e) => {
      if (e.cancelable) e.preventDefault();
      unlockAudio();
      spinBtn.classList.add('pressed');
      keys.down = true;
      keys.jumpJustPressed = true;
      keys.jump = true;
    };
    const endSpin = (e) => {
      if (e && e.cancelable) e.preventDefault();
      spinBtn.classList.remove('pressed');
      keys.down = false;
      keys.jump = false;
    };
    spinBtn.addEventListener('touchstart', startSpin, { passive: false });
    spinBtn.addEventListener('touchend', endSpin, { passive: false });
    spinBtn.addEventListener('touchcancel', endSpin, { passive: false });
    spinBtn.addEventListener('mousedown', startSpin);
    spinBtn.addEventListener('mouseup', endSpin);
  }

  // Allow sliding thumb between Left / Down / Right D-pad buttons smoothly on iOS
  const dpad = document.querySelector('.touch-dpad');
  if (dpad) {
    dpad.addEventListener(
      'touchmove',
      (e) => {
        if (e.cancelable) e.preventDefault();
        const touch = e.targetTouches[0];
        if (!touch) return;
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        const isLeft = el && el.id === 'btn-left';
        const isRight = el && el.id === 'btn-right';
        const isDown = el && el.id === 'btn-down';

        keys.left = Boolean(isLeft);
        keys.right = Boolean(isRight);
        keys.down = Boolean(isDown);

        document.getElementById('btn-left')?.classList.toggle('pressed', keys.left);
        document.getElementById('btn-right')?.classList.toggle('pressed', keys.right);
        document.getElementById('btn-down')?.classList.toggle('pressed', keys.down);
      },
      { passive: false }
    );
  }
}

setupTouchControls();

// ----------------------------------------------------------------------------
// LEVEL TERRAIN PROFILE & STRUCTURES (Green Hill Zone Act 1 Inspired)
// ----------------------------------------------------------------------------
const LOOP_1 = { cx: 3550, cy: 280, r: 140, entryX: 3420, exitX: 3680 };
const LOOP_2 = { cx: 7450, cy: 260, r: 140, entryX: 7320, exitX: 7580 };

function getGroundY(x) {
  if (x < 0) return 420;

  // Section 1: Opening flat + gentle speed hills (0 -> 1300)
  if (x < 600) return 420;
  if (x < 1300) {
    const t = (x - 600) / 700;
    return 420 - Math.sin(t * Math.PI * 2) * 52;
  }

  // Section 2: Suspension Bridge over Robo-Waterfall (1300 -> 1660)
  if (x >= 1300 && x <= 1660) {
    const t = (x - 1300) / 360;
    let sag = Math.sin(t * Math.PI) * 20;
    if (player && player.grounded && player.x >= 1300 && player.x <= 1660) {
      const dist = Math.abs(x - player.x);
      if (dist < 110) sag += (1 - dist / 110) * 14;
    }
    return 420 + sag;
  }

  // Section 3: Rolling hills & steep speed valley into Loop 1 (1660 -> 3350)
  if (x < 2450) {
    const t = (x - 1660) / 790;
    return 420 - Math.sin(t * Math.PI) * 95;
  }
  if (x < 3350) {
    const t = (x - 2450) / 900;
    return 420 + Math.sin(t * Math.PI) * 55;
  }

  // Section 4: Loop-de-Loop 1 Base (3350 -> 3750)
  if (x < 3750) return 420;

  // Section 5: Mid-Act S-slopes & canyon dip (3750 -> 5600)
  if (x < 4650) {
    const t = (x - 3750) / 900;
    return 420 - Math.sin(t * Math.PI * 2) * 75;
  }
  if (x < 5600) {
    const t = (x - 4650) / 950;
    return 420 - Math.sin(t * Math.PI) * 115;
  }

  // Section 6: Second Suspension Bridge (5600 -> 5960)
  if (x >= 5600 && x <= 5960) {
    const t = (x - 5600) / 360;
    let sag = Math.sin(t * Math.PI) * 22;
    if (player && player.grounded && player.x >= 5600 && player.x <= 5960) {
      const dist = Math.abs(x - player.x);
      if (dist < 110) sag += (1 - dist / 110) * 14;
    }
    return 420 + sag;
  }

  // Section 7: High-speed downhill chute into Loop 2 (5960 -> 7250)
  if (x < 6500) {
    const t = (x - 5960) / 540;
    return 420 - Math.sin(t * Math.PI * 0.5) * 140; // Climbs to 280
  }
  if (x < 7250) {
    const t = (x - 6500) / 750;
    return 280 + (1 - Math.cos(t * Math.PI)) * 60; // Drops smoothly from 280 to 400
  }

  // Section 8: Loop 2 & Final Sprint to Goal Post (7250 -> 9400)
  return 400;
}

function getGroundAngle(x) {
  const dx = 4;
  const y1 = getGroundY(x - dx);
  const y2 = getGroundY(x + dx);
  return Math.atan2(y2 - y1, dx * 2);
}

// ----------------------------------------------------------------------------
// GAME STATE & ENTITIES
// ----------------------------------------------------------------------------
let player = null;
let camera = { x: 0, y: 0 };
let score = 0;
let timeSeconds = 0;
let frameCount = 0;
let titleCardTimer = 170;
let checkpointState = null;

let platforms = [];
let rings = [];
let scatteredRings = [];
let badniks = [];
let springs = [];
let monitors = [];
let checkpoints = [];
let freedMiniBots = [];
let particles = [];
let afterimages = [];
let palmTrees = [];
let totems = [];
let flowers = [];
let goalPost = null;

function createPlayer(spawnX, spawnY) {
  return {
    x: spawnX,
    y: spawnY,
    vx: 0,
    vy: 0,
    gsp: 0,
    angle: 0,
    radius: 24,
    facing: 1,
    grounded: true,
    onPlatform: null,
    rolling: false,
    crouching: false,
    skidding: false,
    spinDashCharge: 0,
    inLoop: null,
    loopTheta: 0,
    rings: 0,
    shield: false,
    speedShoesTimer: 0,
    invulnTimer: 0,
    hurtTimer: 0,
    animCycle: 0
  };
}

function buildRingArc(startX, startY, count, spacing, arcHeight) {
  for (let i = 0; i < count; i++) {
    const t = count > 1 ? i / (count - 1) : 0;
    const x = startX + i * spacing;
    const y = startY - Math.sin(t * Math.PI) * arcHeight;
    rings.push({ x, y, collected: false });
  }
}

function buildLoopRings(loop) {
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    rings.push({
      x: loop.cx + Math.cos(a) * (loop.r - 24),
      y: loop.cy + Math.sin(a) * (loop.r - 24),
      collected: false
    });
  }
}

function initLevel(useCheckpoint = true) {
  frameCount = 0;
  titleCardTimer = 150;
  scatteredRings = [];
  freedMiniBots = [];
  particles = [];
  afterimages = [];

  const spawnX = useCheckpoint && checkpointState ? checkpointState.x : 140;
  const spawnY = useCheckpoint && checkpointState ? checkpointState.y : getGroundY(140) - 24;
  player = createPlayer(spawnX, spawnY);
  if (!useCheckpoint) {
    score = 0;
    timeSeconds = 0;
    checkpointState = null;
  }

  // Elevated High-Route & Mid-Route Platforms (Green Hill tiered layout)
  platforms = [
    { x: 920, y: 290, w: 180, h: 36, type: 'static' },
    { x: 1180, y: 220, w: 150, h: 36, type: 'movingY', baseY: 220, range: 55, speed: 0.035 },
    { x: 1850, y: 260, w: 220, h: 36, type: 'static' },
    { x: 2150, y: 195, w: 190, h: 36, type: 'static' },
    { x: 2780, y: 310, w: 210, h: 36, type: 'movingX', baseX: 2780, range: 80, speed: 0.03 },
    { x: 4050, y: 270, w: 230, h: 36, type: 'static' },
    { x: 4360, y: 195, w: 240, h: 36, type: 'static' },
    { x: 4950, y: 215, w: 200, h: 36, type: 'movingY', baseY: 215, range: 60, speed: 0.04 },
    { x: 6150, y: 200, w: 250, h: 36, type: 'static' }
  ];

  // Scenic Cyber-Palm Trees & Totem Pylons
  palmTrees = [
    { x: 240, scale: 1.0 },
    { x: 540, scale: 1.15 },
    { x: 1120, scale: 0.95 },
    { x: 1740, scale: 1.1 },
    { x: 2320, scale: 1.0 },
    { x: 3260, scale: 1.2 },
    { x: 3840, scale: 1.0 },
    { x: 4540, scale: 1.15 },
    { x: 5480, scale: 1.0 },
    { x: 6060, scale: 1.1 },
    { x: 7180, scale: 1.2 },
    { x: 7850, scale: 1.05 },
    { x: 8380, scale: 1.1 }
  ];

  totems = [
    { x: 410, h: 135 },
    { x: 2020, h: 145 },
    { x: 3920, h: 135 },
    { x: 6420, h: 145 },
    { x: 8100, h: 135 }
  ];

  flowers = [];
  for (let fx = 180; fx < LEVEL_LENGTH - 400; fx += 190) {
    if ((fx > 1280 && fx < 1680) || (fx > 5580 && fx < 5980)) continue;
    flowers.push({ x: fx, phase: (fx * 0.13) % (Math.PI * 2) });
  }

  // Power Rings (Ground lines, jump arcs, platform rewards, loop interiors)
  rings = [];
  buildRingArc(300, getGroundY(300) - 28, 5, 34, 0);
  buildRingArc(680, getGroundY(780) - 42, 6, 36, 45);
  buildRingArc(945, 255, 4, 36, 0);
  buildRingArc(1350, 385, 7, 42, 55); // Over Bridge 1
  buildRingArc(1880, 225, 5, 36, 0);
  buildRingArc(2175, 160, 4, 36, 0);
  buildRingArc(2580, getGroundY(2680) - 34, 7, 36, 35);
  buildLoopRings(LOOP_1);
  buildRingArc(3820, getGroundY(3900) - 32, 6, 36, 30);
  buildRingArc(4390, 160, 5, 36, 0);
  buildRingArc(5050, getGroundY(5150) - 36, 8, 36, 48);
  buildRingArc(5650, 385, 7, 42, 55); // Over Bridge 2
  buildRingArc(6620, getGroundY(6750) - 32, 8, 40, 25);
  buildLoopRings(LOOP_2);
  buildRingArc(7750, 365, 8, 38, 0);

  // Springs (Red & Yellow high-bounce pads)
  springs = [
    { x: 885, y: getGroundY(885), power: 13.8, color: '#ff3344', compress: 0, dir: 'up' },
    { x: 1790, y: getGroundY(1790), power: 14.5, color: '#ffdd00', compress: 0, dir: 'up' },
    { x: 3120, y: getGroundY(3120), power: 13.5, color: '#ffdd00', compress: 0, dir: 'rightBoost' },
    { x: 3990, y: getGroundY(3990), power: 14.8, color: '#ff3344', compress: 0, dir: 'up' },
    { x: 6080, y: getGroundY(6080), power: 15.2, color: '#ff3344', compress: 0, dir: 'up' },
    { x: 7020, y: getGroundY(7020), power: 14.0, color: '#ffdd00', compress: 0, dir: 'rightBoost' }
  ];

  // CRT Item Monitors (10 Rings, Plasma Shield, Overclock Speed Boost)
  monitors = [
    { x: 490, y: getGroundY(490) - 22, type: 'rings', broken: false },
    { x: 1010, y: 290 - 22, type: 'shield', broken: false },
    { x: 2240, y: 195 - 22, type: 'speed', broken: false },
    { x: 3250, y: getGroundY(3250) - 22, type: 'rings', broken: false },
    { x: 4480, y: 195 - 22, type: 'shield', broken: false },
    { x: 6270, y: 200 - 22, type: 'speed', broken: false },
    { x: 7680, y: getGroundY(7680) - 22, type: 'rings', broken: false }
  ];

  // Star Post Checkpoints
  checkpoints = [
    { x: 3200, y: getGroundY(3200), active: checkpointState && checkpointState.x >= 3200, spinAngle: 0 },
    { x: 6020, y: getGroundY(6020), active: checkpointState && checkpointState.x >= 6020, spinAngle: 0 }
  ];

  // Classic Green Hill Badniks (Motobug, Buzz Bomber, Chopper, Crabmeat)
  badniks = [
    { type: 'motobug', x: 760, y: getGroundY(760), minX: 620, maxX: 860, vx: -1.3, alive: true, timer: 0 },
    { type: 'buzzbomber', x: 1120, y: 170, minX: 940, maxX: 1280, vx: -2.0, alive: true, timer: 0 },
    { type: 'chopper', x: 1420, y: 490, baseY: 495, vy: -8.5, alive: true, timer: 0 },
    { type: 'chopper', x: 1560, y: 520, baseY: 495, vy: -6.5, alive: true, timer: 25 },
    { type: 'crabmeat', x: 1960, y: 260 - 16, onPlatformIdx: 2, minX: 1870, maxX: 2045, vx: 1.0, alive: true, timer: 0 },
    { type: 'motobug', x: 2380, y: getGroundY(2380), minX: 2150, maxX: 2550, vx: -1.4, alive: true, timer: 0 },
    { type: 'buzzbomber', x: 2950, y: 210, minX: 2720, maxX: 3140, vx: -2.2, alive: true, timer: 0 },
    { type: 'motobug', x: 3910, y: getGroundY(3910), minX: 3780, maxX: 4060, vx: -1.4, alive: true, timer: 0 },
    { type: 'crabmeat', x: 4165, y: 270 - 16, onPlatformIdx: 5, minX: 4070, maxX: 4260, vx: 1.0, alive: true, timer: 0 },
    { type: 'buzzbomber', x: 4780, y: 180, minX: 4560, maxX: 5020, vx: -2.1, alive: true, timer: 0 },
    { type: 'motobug', x: 5340, y: getGroundY(5340), minX: 5120, maxX: 5520, vx: -1.5, alive: true, timer: 0 },
    { type: 'chopper', x: 5710, y: 495, baseY: 495, vy: -8.5, alive: true, timer: 10 },
    { type: 'chopper', x: 5850, y: 495, baseY: 495, vy: -7.8, alive: true, timer: 40 },
    { type: 'crabmeat', x: 6820, y: getGroundY(6820), minX: 6680, maxX: 7000, vx: 1.1, alive: true, timer: 0 },
    { type: 'motobug', x: 7920, y: getGroundY(7920), minX: 7720, maxX: 8150, vx: -1.6, alive: true, timer: 0 }
  ];

  // End-of-Act Spinning Signpost & Giant Cyber-Prison Capsule
  goalPost = {
    x: 8420,
    y: getGroundY(8420),
    capsuleX: 8680,
    capsuleY: getGroundY(8680),
    triggered: false,
    spinTimer: 0,
    capsuleOpened: false,
    clearTimer: 0,
    timeBonus: 0,
    ringBonus: 0
  };
}

// ----------------------------------------------------------------------------
// PARTICLE & MINI-BOT HELPERS
// ----------------------------------------------------------------------------
function spawnParticles(x, y, color, count = 8, speed = 3.5) {
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const s = (0.4 + Math.random() * 0.8) * speed;
    particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 1.2,
      life: 24 + Math.floor(Math.random() * 14),
      maxLife: 38,
      color,
      size: 3 + Math.random() * 3
    });
  }
}

function spawnFreedMiniBot(x, y) {
  freedMiniBots.push({
    x,
    y,
    vx: (Math.random() > 0.5 ? 1 : -1) * (1.8 + Math.random() * 1.6),
    vy: -5.5 - Math.random() * 2,
    timer: 0
  });
}

// ----------------------------------------------------------------------------
// PHYSICS & GAMEPLAY UPDATE
// ----------------------------------------------------------------------------
function update() {
  frameCount++;
  if (titleCardTimer > 0) titleCardTimer--;

  if (!goalPost.triggered && frameCount % 60 === 0) {
    timeSeconds++;
  }

  // Update Moving Platforms
  platforms.forEach((p) => {
    p.prevX = p.x;
    p.prevY = p.y;
    if (p.type === 'movingY') {
      p.y = p.baseY + Math.sin(frameCount * p.speed) * p.range;
    } else if (p.type === 'movingX') {
      p.x = p.baseX + Math.cos(frameCount * p.speed) * p.range;
    }
  });

  updatePlayer();
  updateRings();
  updateSprings();
  updateMonitors();
  updateCheckpoints();
  updateBadniks();
  updateGoalPost();
  updateParticlesAndMiniBots();

  // Smooth Look-Ahead Sonic Camera
  const lookAhead = player.vx * 14;
  const targetCamX = Math.max(0, Math.min(LEVEL_LENGTH - W, player.x - W * 0.36 + lookAhead));
  camera.x += (targetCamX - camera.x) * 0.14;

  keys.jumpJustPressed = false;
}

function updatePlayer() {
  const p = player;
  if (p.invulnTimer > 0) p.invulnTimer--;
  if (p.hurtTimer > 0) p.hurtTimer--;
  if (p.speedShoesTimer > 0) p.speedShoesTimer--;

  const speedMult = p.speedShoesTimer > 0 ? 1.38 : 1.0;
  const acc = 0.095 * speedMult;
  const dec = 0.48;
  const frc = 0.065;
  const topSpeed = 9.2 * speedMult;
  const maxSpeed = 15.5;
  const slopeFactorNormal = 0.16;
  const slopeFactorRollUp = 0.11;
  const slopeFactorRollDown = 0.36;

  // Advance Gizmo-Bot's leg cycle proportional to running speed
  const absSpd = Math.abs(p.gsp);
  if (absSpd > 0.2) {
    p.animCycle += 0.09 + absSpd * 0.032;
  } else {
    p.animCycle = 0;
  }

  // Spawn high-speed afterimage trail when sprinting or spin-dashing
  if ((absSpd > 6.8 || p.rolling || p.inLoop) && frameCount % 3 === 0) {
    afterimages.push({
      x: p.x,
      y: p.y,
      facing: p.facing,
      angle: p.angle,
      rolling: p.rolling || p.inLoop !== null,
      alpha: 0.42
    });
  }

  // Victory Auto-Pose after capsule opens
  if (goalPost.capsuleOpened) {
    p.vx *= 0.85;
    p.gsp *= 0.85;
    p.rolling = false;
  }

  // --------------------------------------------------------------------------
  // 360 LOOP-DE-LOOP STATE
  // --------------------------------------------------------------------------
  if (p.inLoop) {
    const loop = p.inLoop;
    const angularSpeed = p.gsp / (loop.r - p.radius);
    p.loopTheta -= angularSpeed;
    p.x = loop.cx + Math.cos(p.loopTheta) * (loop.r - p.radius);
    p.y = loop.cy + Math.sin(p.loopTheta) * (loop.r - p.radius);
    p.angle = p.loopTheta - Math.PI / 2;
    p.vx = Math.cos(p.angle) * p.gsp;
    p.vy = Math.sin(p.angle) * p.gsp;
    p.rolling = true;

    if (frameCount % 2 === 0) {
      spawnParticles(p.x, p.y, '#00f0ff', 2, 1.5);
    }

    if (p.loopTheta <= -Math.PI * 1.5) {
      p.inLoop = null;
      p.x = loop.cx + 18;
      p.y = getGroundY(p.x) - p.radius;
      p.angle = 0;
      p.grounded = true;
    }
    return;
  }

  // --------------------------------------------------------------------------
  // GROUNDED MOMENTUM & SPIN DASH
  // --------------------------------------------------------------------------
  if (p.grounded && p.hurtTimer === 0 && !goalPost.capsuleOpened) {
    const sinA = Math.sin(p.angle);
    if (p.rolling) {
      const sameDir = (p.gsp > 0 && sinA > 0) || (p.gsp < 0 && sinA < 0);
      p.gsp += sinA * (sameDir ? slopeFactorRollDown : slopeFactorRollUp);
    } else {
      p.gsp += sinA * slopeFactorNormal;
    }

    // Spin Dash when crouching still
    if (keys.down && Math.abs(p.gsp) < 0.6 && !p.rolling) {
      p.crouching = true;
      p.gsp = 0;
      if (keys.jumpJustPressed) {
        p.spinDashCharge = Math.min(6, p.spinDashCharge + 1.5);
        window.soundEngine.playSpinDashRev(p.spinDashCharge);
        spawnParticles(p.x - p.facing * 14, p.y + 14, '#00f0ff', 5, 2.5);
      }
      p.spinDashCharge = Math.max(0, p.spinDashCharge - 0.015);
    } else {
      if (p.crouching && p.spinDashCharge > 0) {
        p.rolling = true;
        p.crouching = false;
        p.gsp = (9.5 + p.spinDashCharge * 0.95) * p.facing;
        p.spinDashCharge = 0;
        window.soundEngine.playSpinRelease();
        spawnParticles(p.x, p.y + 10, '#4bf3ff', 10, 4.0);
      }
      p.crouching = false;

      if (keys.down && Math.abs(p.gsp) >= 1.2 && !p.rolling) {
        p.rolling = true;
        window.soundEngine.playSpinRelease();
      }
    }

    // Horizontal Controls
    if (!p.crouching) {
      if (p.rolling) {
        if (keys.left && p.gsp > 0) p.gsp -= dec * 0.5;
        if (keys.right && p.gsp < 0) p.gsp += dec * 0.5;
        p.gsp -= Math.min(Math.abs(p.gsp), frc * 0.45) * Math.sign(p.gsp);
        if (Math.abs(p.gsp) < 0.45) p.rolling = false;
      } else {
        p.skidding = false;
        if (keys.left && !keys.right) {
          if (p.gsp > 0) {
            p.gsp -= dec;
            if (p.gsp > 2.4) {
              p.skidding = true;
              if (frameCount % 6 === 0) {
                window.soundEngine.playSkid();
                spawnParticles(p.x + 12, p.y + 18, '#d8e4ff', 2, 1.4);
              }
            }
          } else {
            p.facing = -1;
            if (p.gsp > -topSpeed) p.gsp = Math.max(-topSpeed, p.gsp - acc);
          }
        } else if (keys.right && !keys.left) {
          if (p.gsp < 0) {
            p.gsp += dec;
            if (p.gsp < -2.4) {
              p.skidding = true;
              if (frameCount % 6 === 0) {
                window.soundEngine.playSkid();
                spawnParticles(p.x - 12, p.y + 18, '#d8e4ff', 2, 1.4);
              }
            }
          } else {
            p.facing = 1;
            if (p.gsp < topSpeed) p.gsp = Math.min(topSpeed, p.gsp + acc);
          }
        } else {
          p.gsp -= Math.min(Math.abs(p.gsp), frc) * Math.sign(p.gsp);
        }
      }
    }

    p.gsp = Math.max(-maxSpeed, Math.min(maxSpeed, p.gsp));
    p.vx = p.gsp * Math.cos(p.angle);
    p.vy = p.gsp * Math.sin(p.angle);

    // Jump off ground (perpendicular to slope normal!)
    // Use Helicopter Jump pose unless player explicitly holds Down to roll-jump
    if (keys.jumpJustPressed && !p.crouching) {
      const jumpStrength = 9.8;
      p.vx -= jumpStrength * Math.sin(p.angle);
      p.vy -= jumpStrength * Math.cos(p.angle);
      p.grounded = false;
      p.onPlatform = null;
      p.rolling = keys.down;
      p.angle = 0;
      window.soundEngine.playJump();
    }
  } else {
    // ------------------------------------------------------------------------
    // AIRBORNE PHYSICS
    // ------------------------------------------------------------------------
    const airAcc = acc * 1.65;
    if (p.hurtTimer === 0 && !goalPost.capsuleOpened) {
      if (keys.left && p.vx > -topSpeed) p.vx -= airAcc;
      if (keys.right && p.vx < topSpeed) p.vx += airAcc;
      if (keys.left) p.facing = -1;
      if (keys.right) p.facing = 1;
    }

    if (!keys.jump && p.vy < -4.4 && p.hurtTimer === 0) {
      p.vy = -4.4;
    }

    if (p.vy < 0 && p.vy > -4.5) {
      p.vx -= ((p.vx / 0.125) / 256) * 0.4;
    }
    p.vy = Math.min(14, p.vy + 0.36);
    p.angle *= 0.85;
  }

  // Apply Position
  p.x += p.vx;
  p.y += p.vy;
  if (p.x < 24) {
    p.x = 24;
    p.vx = 0;
    p.gsp = 0;
  }

  // Check Entry into 360 Loops!
  [LOOP_1, LOOP_2].forEach((loop) => {
    if (
      p.grounded &&
      !p.inLoop &&
      p.x >= loop.cx - 24 &&
      p.x <= loop.cx + 28 &&
      p.gsp >= 7.2
    ) {
      p.inLoop = loop;
      p.loopTheta = Math.PI / 2;
      p.gsp = Math.max(p.gsp, 9.6);
    }
  });

  // Carry player with moving platform
  if (p.grounded && p.onPlatform) {
    const plat = p.onPlatform;
    p.x += plat.x - plat.prevX;
    p.y = plat.y - p.radius;
    p.angle = 0;
    if (p.x < plat.x - 10 || p.x > plat.x + plat.w + 10) {
      p.grounded = false;
      p.onPlatform = null;
    }
  }

  // Check One-Way Elevated Platforms when falling
  if (p.vy >= 0 && !p.inLoop) {
    for (const plat of platforms) {
      const withinX = p.x >= plat.x - 8 && p.x <= plat.x + plat.w + 8;
      const footY = p.y + p.radius;
      const prevFootY = footY - p.vy;
      if (withinX && prevFootY <= plat.y + 8 && footY >= plat.y - 4) {
        p.y = plat.y - p.radius;
        p.vy = 0;
        if (!p.grounded) {
          p.grounded = true;
          p.gsp = p.vx;
          p.rolling = false;
          p.hurtTimer = 0;
        }
        p.onPlatform = plat;
        p.angle = 0;
        break;
      }
    }
  }

  // Check Curved Ground Terrain Collision
  if (!p.onPlatform && !p.inLoop) {
    const groundY = getGroundY(p.x);
    if (p.grounded) {
      if (p.y + p.radius <= groundY + 26) {
        p.y = groundY - p.radius;
        p.angle = getGroundAngle(p.x);
      } else {
        p.grounded = false;
      }
    } else if (p.vy >= 0 && p.y + p.radius >= groundY) {
      p.y = groundY - p.radius;
      p.angle = getGroundAngle(p.x);
      p.grounded = true;
      p.rolling = false;
      p.hurtTimer = 0;
      p.gsp = p.vx * Math.cos(p.angle) + p.vy * Math.sin(p.angle);
      p.vy = 0;
    }
  }
}

function damagePlayer(sourceX) {
  const p = player;
  if (p.invulnTimer > 0 || p.hurtTimer > 0) return;

  if (p.shield) {
    p.shield = false;
    p.invulnTimer = 110;
    p.vy = -6.5;
    p.vx = p.x < sourceX ? -4.5 : 4.5;
    p.grounded = false;
    window.soundEngine.playBadnikPop();
    spawnParticles(p.x, p.y, '#00f0ff', 14, 4.5);
    return;
  }

  if (p.rings > 0) {
    const count = Math.min(p.rings, 24);
    for (let i = 0; i < count; i++) {
      const a = -Math.PI * 0.15 - (i / count) * Math.PI * 0.7;
      const spd = (i % 2 === 0 ? 4.8 : 3.2) + Math.random() * 1.2;
      scatteredRings.push({
        x: p.x,
        y: p.y - 6,
        vx: Math.cos(a) * spd * (i % 2 === 0 ? 1 : -1),
        vy: Math.sin(a) * spd - 2.5,
        life: 240
      });
    }
    p.rings = 0;
    p.invulnTimer = 120;
    p.hurtTimer = 45;
    p.grounded = false;
    p.onPlatform = null;
    p.rolling = false;
    p.vx = p.x < sourceX ? -4.2 : 4.2;
    p.vy = -6.8;
    window.soundEngine.playRingLoss();
  } else {
    window.soundEngine.playBadnikPop();
    initLevel(true);
  }
}

function updateRings() {
  const p = player;
  rings.forEach((r) => {
    if (!r.collected && Math.hypot(p.x - r.x, p.y - r.y) < p.radius + 14) {
      r.collected = true;
      p.rings++;
      score += 10;
      window.soundEngine.playRing();
      spawnParticles(r.x, r.y, '#ffe600', 5, 2.2);
    }
  });

  for (let i = scatteredRings.length - 1; i >= 0; i--) {
    const sr = scatteredRings[i];
    sr.x += sr.vx;
    sr.y += sr.vy;
    sr.vy += 0.26;
    sr.life--;

    const gy = getGroundY(sr.x);
    if (sr.y + 8 > gy) {
      sr.y = gy - 8;
      sr.vy = -sr.vy * 0.74;
    }

    if (sr.life < 205 && Math.hypot(p.x - sr.x, p.y - sr.y) < p.radius + 13) {
      p.rings++;
      window.soundEngine.playRing();
      spawnParticles(sr.x, sr.y, '#ffe600', 4, 2.0);
      scatteredRings.splice(i, 1);
      continue;
    }

    if (sr.life <= 0) {
      scatteredRings.splice(i, 1);
    }
  }
}

function updateSprings() {
  const p = player;
  springs.forEach((s) => {
    if (s.compress > 0) s.compress--;
    if (Math.hypot(p.x - s.x, p.y - (s.y - 12)) < p.radius + 18) {
      s.compress = 14;
      window.soundEngine.playSpring();
      if (s.dir === 'rightBoost') {
        p.gsp = Math.max(p.gsp, s.power);
        p.vx = s.power;
        p.vy = -3.5;
        p.facing = 1;
      } else {
        p.vy = -s.power;
        p.grounded = false;
        p.onPlatform = null;
        p.rolling = false;
      }
      spawnParticles(s.x, s.y - 12, s.color, 8, 3.2);
    }
  });
}

function updateMonitors() {
  const p = player;
  monitors.forEach((m) => {
    if (m.broken) return;
    const dist = Math.hypot(p.x - m.x, p.y - m.y);
    if (dist < p.radius + 20) {
      if (p.rolling || p.vy > 0 || !p.grounded) {
        m.broken = true;
        if (p.vy > 0) p.vy = -p.vy * 0.85;
        window.soundEngine.playBadnikPop();
        spawnParticles(m.x, m.y, '#4bf3ff', 12, 3.8);

        if (m.type === 'rings') {
          p.rings += 10;
          score += 100;
          window.soundEngine.playRing();
        } else if (m.type === 'shield') {
          p.shield = true;
        } else if (m.type === 'speed') {
          p.speedShoesTimer = 900;
        }
      }
    }
  });
}

function updateCheckpoints() {
  const p = player;
  checkpoints.forEach((cp) => {
    if (cp.active) {
      cp.spinAngle += 0.22;
    } else if (Math.abs(p.x - cp.x) < 26 && Math.abs(p.y - (cp.y - 32)) < 45) {
      cp.active = true;
      checkpointState = { x: cp.x, y: cp.y - 24 };
      window.soundEngine.playCheckpoint();
      spawnParticles(cp.x, cp.y - 44, '#ff3366', 10, 3.2);
    }
  });
}

function updateBadniks() {
  const p = player;
  badniks.forEach((b) => {
    if (!b.alive) return;
    b.timer++;

    if (b.type === 'motobug') {
      b.x += b.vx;
      if (b.x < b.minX || b.x > b.maxX) b.vx = -b.vx;
      b.y = getGroundY(b.x) - 22;
    } else if (b.type === 'buzzbomber') {
      if (b.timer % 140 < 105) {
        b.x += b.vx;
        if (b.x < b.minX || b.x > b.maxX) b.vx = -b.vx;
      }
      b.y += Math.sin(b.timer * 0.08) * 0.6;
    } else if (b.type === 'chopper') {
      b.y += b.vy;
      b.vy += 0.22;
      if (b.y > b.baseY) {
        b.y = b.baseY;
        b.vy = -8.6;
      }
    } else if (b.type === 'crabmeat') {
      b.x += b.vx;
      if (b.x < b.minX || b.x > b.maxX) b.vx = -b.vx;
      if (b.onPlatformIdx !== undefined) {
        b.y = platforms[b.onPlatformIdx].y - 20;
      } else {
        b.y = getGroundY(b.x) - 20;
      }
    }

    // Player vs Badnik Collision
    const dist = Math.hypot(p.x - b.x, p.y - b.y);
    if (dist < p.radius + 22) {
      const playerAttacking = p.rolling || !p.grounded || p.spinDashCharge > 0;
      if (playerAttacking) {
        b.alive = false;
        score += 100;
        if (!p.grounded && p.vy > 0) {
          p.vy = -Math.max(5.5, p.vy * 0.92);
        }
        window.soundEngine.playBadnikPop();
        spawnParticles(b.x, b.y, '#ff8833', 16, 4.5);
        spawnFreedMiniBot(b.x, b.y - 6);
      } else {
        damagePlayer(b.x);
      }
    }
  });
}

function updateGoalPost() {
  const p = player;
  if (!goalPost.triggered && p.x >= goalPost.x) {
    goalPost.triggered = true;
    goalPost.spinTimer = 95;
    window.soundEngine.playCheckpoint();
    spawnParticles(goalPost.x, goalPost.y - 52, '#ffe600', 12, 3.5);
  }

  if (goalPost.triggered && goalPost.spinTimer > 0) {
    goalPost.spinTimer--;
  }

  // Giant Cyber-Prison Capsule button stomp!
  const capX = goalPost.capsuleX;
  const capY = goalPost.capsuleY;
  if (!goalPost.capsuleOpened) {
    const onSwitch =
      Math.abs(p.x - capX) < 42 &&
      p.y + p.radius >= capY - 115 &&
      p.y + p.radius <= capY - 70 &&
      p.vy >= 0;

    if (onSwitch) {
      goalPost.capsuleOpened = true;
      p.vy = -6.5;
      goalPost.ringBonus = p.rings * 100;
      goalPost.timeBonus = timeSeconds < 60 ? 5000 : timeSeconds < 120 ? 2000 : 500;
      score += goalPost.ringBonus + goalPost.timeBonus;
      window.soundEngine.playVictoryFanfare();
      spawnParticles(capX, capY - 58, '#00f0ff', 28, 6.0);
      for (let i = 0; i < 12; i++) {
        spawnFreedMiniBot(capX + (Math.random() - 0.5) * 50, capY - 50);
      }
    }
  } else {
    goalPost.clearTimer++;
  }
}

function updateParticlesAndMiniBots() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.life--;
    if (pt.life <= 0) particles.splice(i, 1);
  }

  for (let i = afterimages.length - 1; i >= 0; i--) {
    afterimages[i].alpha -= 0.055;
    if (afterimages[i].alpha <= 0) afterimages.splice(i, 1);
  }

  freedMiniBots.forEach((mb) => {
    mb.timer++;
    mb.x += mb.vx;
    mb.y += mb.vy;
    mb.vy += 0.14;
    if (mb.vy > 2.0) mb.vy = -3.8;
  });
}

// ----------------------------------------------------------------------------
// NANO BANANA HD PIXEL-ART RENDERING PIPELINE
// ----------------------------------------------------------------------------
function render() {
  ctx.clearRect(0, 0, W, H);

  drawParallaxBackground();

  ctx.save();
  ctx.translate(-Math.floor(camera.x), 0);

  drawRoboWaterfalls();
  drawLoopBack(LOOP_1);
  drawLoopBack(LOOP_2);
  drawSceneryBehind();
  drawTerrainAndBridges();
  drawPlatforms();
  drawCheckpoints();
  drawSprings();
  drawMonitors();
  drawGoalAndCapsule();
  drawRings();
  drawFreedMiniBots();
  drawBadniks();
  drawAfterimages();
  drawPlayer();
  drawLoopFront(LOOP_1);
  drawLoopFront(LOOP_2);
  drawParticles();

  ctx.restore();

  drawHUD();
  if (titleCardTimer > 0) drawTitleCard();
  if (goalPost.capsuleOpened && goalPost.clearTimer > 50) drawActClearScreen();
}

function drawParallaxBackground() {
  if (assetsReady && sprites.bg_chrome_hill) {
    const bg = sprites.bg_chrome_hill;
    const drawW = W;
    const drawH = H;
    const scrollX = Math.floor(camera.x * 0.22) % drawW;

    ctx.drawImage(bg, -scrollX, 0, drawW, drawH);
    ctx.drawImage(bg, drawW - scrollX, 0, drawW, drawH);

    // Subtle atmospheric contrast tint so foreground sprites stand out cleanly
    const overlay = ctx.createLinearGradient(0, 0, 0, H);
    overlay.addColorStop(0, 'rgba(4, 10, 32, 0.06)');
    overlay.addColorStop(0.65, 'rgba(6, 18, 48, 0.14)');
    overlay.addColorStop(1, 'rgba(4, 10, 28, 0.30)');
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, W, H);
    return;
  }

  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, '#00249c');
  skyGrad.addColorStop(1, '#102e78');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);
}

function drawRoboWaterfalls() {
  const bridges = [
    { start: 1300, end: 1660 },
    { start: 5600, end: 5960 }
  ];
  const scroll = (frameCount * 6) % 36;
  bridges.forEach((b) => {
    if (b.end < camera.x - 100 || b.start > camera.x + W + 100) return;
    const width = b.end - b.start;
    const grad = ctx.createLinearGradient(0, 415, 0, H);
    grad.addColorStop(0, '#00b4d8');
    grad.addColorStop(1, '#03045e');
    ctx.fillStyle = grad;
    ctx.fillRect(b.start, 415, width, H - 415);

    ctx.fillStyle = 'rgba(144, 224, 239, 0.75)';
    for (let x = b.start + 16; x < b.end - 16; x += 36) {
      for (let y = 415 + scroll; y < H; y += 36) {
        ctx.fillRect(x, y, 12, 20);
      }
    }
  });
}

function drawSceneryBehind() {
  // Nano Banana Cyber-Palm Trees
  palmTrees.forEach((tree) => {
    if (tree.x < camera.x - 180 || tree.x > camera.x + W + 180) return;
    const gy = getGroundY(tree.x);
    if (assetsReady && sprites.palm_tree) {
      const pw = 138 * tree.scale;
      const ph = 185 * tree.scale;
      ctx.drawImage(sprites.palm_tree, tree.x - pw / 2, gy - ph + 8, pw, ph);
    }
  });

  // Nano Banana Robotic Totem Pylons
  totems.forEach((t) => {
    if (t.x < camera.x - 120 || t.x > camera.x + W + 120) return;
    const gy = getGroundY(t.x);
    if (assetsReady && sprites.totem) {
      const tw = 96;
      const th = t.h;
      ctx.drawImage(sprites.totem, t.x - tw / 2, gy - th + 6, tw, th);
    }
  });

  // Spinning Mechanical Gear-Flowers
  flowers.forEach((f) => {
    if (f.x < camera.x - 60 || f.x > camera.x + W + 60) return;
    const gy = getGroundY(f.x);
    const stemH = 28;
    ctx.fillStyle = '#38d860';
    ctx.fillRect(f.x - 2, gy - stemH, 4, stemH);

    ctx.save();
    ctx.translate(f.x, gy - stemH);
    ctx.rotate(frameCount * 0.05 + f.phase);
    ctx.fillStyle = '#ffdd00';
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.fillRect(-3, -11, 6, 6);
    }
    ctx.fillStyle = '#ff2266';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawTerrainAndBridges() {
  const step = 48;
  const startX = Math.max(0, Math.floor(camera.x / step) * step - step);
  const endX = Math.min(LEVEL_LENGTH, startX + W + step * 3);

  // Draw Sloped Terrain using Nano Banana Ground Tile Texture
  for (let x = startX; x < endX; x += step) {
    if ((x >= 1300 && x < 1640) || (x >= 5600 && x < 5940)) continue;

    const y1 = getGroundY(x);
    const y2 = getGroundY(x + step);
    const midY = (y1 + y2) * 0.5;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y1 - 8);
    ctx.lineTo(x + step + 2, y2 - 8);
    ctx.lineTo(x + step + 2, H + 20);
    ctx.lineTo(x, H + 20);
    ctx.closePath();
    ctx.clip();

    if (assetsReady && sprites.ground_tile) {
      const tileH = 140;
      ctx.drawImage(sprites.ground_tile, x, midY - 10, step + 2, tileH);
      for (let ty = midY + tileH - 28; ty < H; ty += tileH - 36) {
        ctx.drawImage(
          sprites.ground_tile,
          0,
          sprites.ground_tile.height * 0.25,
          sprites.ground_tile.width,
          sprites.ground_tile.height * 0.75,
          x,
          ty,
          step + 2,
          tileH
        );
      }
    } else {
      ctx.fillStyle = '#9c4c14';
      ctx.fillRect(x, midY, step + 1, H - midY);
    }
    ctx.restore();

    // Crisp Neon-Emerald Turf Ribbon following the exact slope curve
    ctx.beginPath();
    ctx.moveTo(x, y1 - 3);
    ctx.lineTo(x + step + 1, y2 - 3);
    ctx.lineTo(x + step + 1, y2 + 12);
    ctx.lineTo(x, y1 + 12);
    ctx.closePath();
    ctx.fillStyle = '#00e838';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x, y1 - 3);
    ctx.lineTo(x + step + 1, y2 - 3);
    ctx.lineTo(x + step + 1, y2 + 3);
    ctx.lineTo(x, y1 + 3);
    ctx.closePath();
    ctx.fillStyle = '#80ff70';
    ctx.fill();
  }

  // Draw Suspension Bridges
  const bridges = [
    { start: 1300, end: 1660 },
    { start: 5600, end: 5960 }
  ];
  bridges.forEach((b) => {
    if (b.end < camera.x - 50 || b.start > camera.x + W + 50) return;
    [b.start, b.end].forEach((px) => {
      ctx.fillStyle = '#708098';
      ctx.fillRect(px - 10, 380, 20, 46);
      ctx.fillStyle = '#ff3344';
      ctx.beginPath();
      ctx.arc(px, 380, 7, 0, Math.PI * 2);
      ctx.fill();
    });

    for (let lx = b.start + 12; lx <= b.end - 12; lx += 24) {
      const ly = getGroundY(lx);
      ctx.fillStyle = '#d47a22';
      ctx.beginPath();
      ctx.arc(lx, ly + 8, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3d1c04';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = '#ffe898';
      ctx.fillRect(lx - 3, ly + 4, 5, 4);
    }
  });
}

function drawLoopBack(loop) {
  if (loop.cx + loop.r < camera.x - 60 || loop.cx - loop.r > camera.x + W + 60) return;
  ctx.save();
  ctx.lineWidth = 38;
  ctx.strokeStyle = '#8c4410';
  ctx.beginPath();
  ctx.arc(loop.cx, loop.cy, loop.r - 8, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 26;
  ctx.setLineDash([18, 18]);
  ctx.strokeStyle = '#d47420';
  ctx.beginPath();
  ctx.arc(loop.cx, loop.cy, loop.r - 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.lineWidth = 10;
  ctx.strokeStyle = '#00e838';
  ctx.beginPath();
  ctx.arc(loop.cx, loop.cy, loop.r - 23, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawLoopFront(loop) {
  if (loop.cx + loop.r < camera.x - 60 || loop.cx - loop.r > camera.x + W + 60) return;
  ctx.save();
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#80ff70';
  ctx.beginPath();
  ctx.arc(loop.cx, loop.cy, loop.r - 24, -Math.PI * 0.85, -Math.PI * 0.15);
  ctx.stroke();
  ctx.restore();
}

function drawPlatforms() {
  platforms.forEach((p) => {
    if (p.x + p.w < camera.x - 40 || p.x > camera.x + W + 40) return;
    if (assetsReady && sprites.ground_tile) {
      ctx.drawImage(sprites.ground_tile, p.x, p.y - 4, p.w, p.h + 8);
      ctx.strokeStyle = '#2b1204';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    } else {
      ctx.fillStyle = '#9c4c14';
      ctx.fillRect(p.x, p.y, p.w, p.h);
    }
  });
}

function drawRings() {
  const spinW = Math.max(3, Math.abs(Math.cos(frameCount * 0.12)) * 10);

  rings.forEach((r) => {
    if (r.collected || r.x < camera.x - 30 || r.x > camera.x + W + 30) return;
    drawSingleRing(r.x, r.y, spinW);
  });

  scatteredRings.forEach((sr) => {
    if (sr.life < 60 && Math.floor(sr.life / 4) % 2 === 0) return;
    drawSingleRing(sr.x, sr.y, spinW);
  });
}

function drawSingleRing(x, y, rx) {
  ctx.save();
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, 10, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#ffe600';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, 10, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#fffbeb';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(x - 1, y - 1, Math.max(1, rx - 1), 8, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawSprings() {
  springs.forEach((s) => {
    if (s.x < camera.x - 40 || s.x > camera.x + W + 40) return;
    const comp = s.compress > 0 ? 6 : 0;
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(s.x - 13, s.y);
    ctx.lineTo(s.x + 13, s.y - 7 + comp * 0.5);
    ctx.lineTo(s.x - 13, s.y - 14 + comp);
    ctx.stroke();

    ctx.fillStyle = s.color;
    ctx.fillRect(s.x - 19, s.y - 23 + comp, 38, 9);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(s.x - 10, s.y - 21 + comp, 20, 3);
  });
}

function drawMonitors() {
  monitors.forEach((m) => {
    if (m.x < camera.x - 50 || m.x > camera.x + W + 50) return;
    if (m.broken) {
      ctx.fillStyle = '#334155';
      ctx.fillRect(m.x - 18, m.y + 8, 36, 12);
      return;
    }

    if (assetsReady && sprites.monitor) {
      ctx.drawImage(sprites.monitor, m.x - 23, m.y - 23, 46, 46);
    } else {
      ctx.fillStyle = '#5c6b84';
      ctx.fillRect(m.x - 18, m.y - 18, 36, 36);
    }

    if (m.type === 'rings') {
      drawSingleRing(m.x, m.y - 3, 5);
    } else if (m.type === 'shield') {
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(m.x, m.y - 3, 7, 0, Math.PI * 2);
      ctx.stroke();
    } else if (m.type === 'speed') {
      ctx.fillStyle = '#ff2244';
      ctx.fillRect(m.x - 7, m.y - 6, 14, 7);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(m.x - 7, m.y - 1, 14, 3);
    }
  });
}

function drawCheckpoints() {
  checkpoints.forEach((cp) => {
    if (cp.x < camera.x - 40 || cp.x > camera.x + W + 40) return;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(cp.x - 3, cp.y - 48, 6, 48);

    const headX = cp.x + Math.sin(cp.spinAngle) * 10;
    const headY = cp.y - 50;
    ctx.fillStyle = cp.active ? (frameCount % 8 < 4 ? '#00f0ff' : '#ffdd00') : '#ff2244';
    ctx.beginPath();
    ctx.arc(headX, headY, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

// ----------------------------------------------------------------------------
// NANO BANANA ALL-ROBOT CHARACTER SPRITES (BADNIKS, MINI-BOTS, & GIZMO-BOT)
// ----------------------------------------------------------------------------
function drawBadniks() {
  badniks.forEach((b) => {
    if (!b.alive || b.x < camera.x - 80 || b.x > camera.x + W + 80) return;
    ctx.save();
    ctx.translate(b.x, b.y);

    if (b.type === 'motobug' && assetsReady && sprites.motobug) {
      const dir = b.vx >= 0 ? 1 : -1;
      ctx.scale(dir, 1);
      const bob = Math.sin(b.timer * 0.35) * 2;
      ctx.drawImage(sprites.motobug, -28, -28 + bob, 56, 52);
    } else if (b.type === 'buzzbomber' && assetsReady && sprites.buzzbomber) {
      const dir = b.vx >= 0 ? 1 : -1;
      ctx.scale(dir, 1);
      ctx.drawImage(sprites.buzzbomber, -32, -32, 64, 60);
    } else if (b.type === 'crabmeat' && assetsReady && sprites.crabmeat) {
      const scuttle = Math.sin(b.timer * 0.3) * 0.08;
      ctx.rotate(scuttle);
      ctx.drawImage(sprites.crabmeat, -30, -26, 60, 52);
    } else if (b.type === 'chopper' && assetsReady && sprites.chopper) {
      const tilt = b.vy < 0 ? -0.35 : 0.45;
      ctx.rotate(tilt);
      ctx.drawImage(sprites.chopper, -28, -28, 56, 54);
    }

    ctx.restore();
  });
}

function drawFreedMiniBots() {
  freedMiniBots.forEach((mb) => {
    if (mb.x < camera.x - 50 || mb.x > camera.x + W + 50) return;
    ctx.save();
    ctx.translate(mb.x, mb.y);
    const dir = mb.vx >= 0 ? 1 : -1;
    ctx.scale(dir, 1);

    if (assetsReady && sprites.flicky) {
      ctx.drawImage(sprites.flicky, -16, -20, 32, 38);
    } else {
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-8, -8, 16, 16);
    }
    ctx.restore();
  });
}

function drawAfterimages() {
  if (!assetsReady) return;
  afterimages.forEach((ai) => {
    ctx.save();
    ctx.globalAlpha = ai.alpha * 0.6;
    ctx.translate(ai.x, ai.y);
    if (ai.rolling && sprites.gizmo_spin) {
      ctx.drawImage(sprites.gizmo_spin, -30, -30, 60, 60);
    } else if (sprites.gizmo_sprint) {
      ctx.rotate(ai.angle);
      ctx.scale(ai.facing, 1);
      ctx.drawImage(sprites.gizmo_sprint, -44, -46, 80, 72);
    }
    ctx.restore();
  });
}

function drawPlayer() {
  const p = player;
  if (p.invulnTimer > 0 && Math.floor(p.invulnTimer / 3) % 2 === 1) return;

  ctx.save();
  ctx.translate(p.x, p.y);

  // 1. Spin Attack / Spin Dash Gear-Wheel Mode (gizmo_spin.png)
  if (p.rolling || (p.crouching && p.spinDashCharge > 0)) {
    const spinRot = frameCount * 0.38 * p.facing;
    ctx.save();
    ctx.rotate(spinRot);
    if (assetsReady && sprites.gizmo_spin) {
      ctx.drawImage(sprites.gizmo_spin, -31, -31, 62, 62);
    } else {
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else {
    // 2. Multi-Frame Animated Gizmo-Bot (Idle, Run1, Run2, Sprint, Skid, Heli-Jump, Victory)
    ctx.save();
    ctx.rotate(p.angle);
    ctx.scale(p.facing, 1);

    const runSpeed = Math.abs(p.gsp);
    const squatY = p.crouching ? 10 : 0;
    const squatH = p.crouching ? -10 : 0;

    let spriteImg = sprites.gizmo_idle;
    let drawW = 58;
    let drawH = 74 + squatH;
    let offsetX = -29;

    if (goalPost.capsuleOpened && sprites.gizmo_victory) {
      spriteImg = sprites.gizmo_victory;
      drawW = 66;
      drawH = 76;
      offsetX = -33;
    } else if (!p.grounded && sprites.gizmo_jump) {
      // Helicopter-Antenna Jump Pose!
      spriteImg = sprites.gizmo_jump;
      drawW = 70;
      drawH = 76;
      offsetX = -35;
    } else if (p.skidding && sprites.gizmo_skid) {
      // Panicked Googly-Eyed Braking Skid Pose!
      spriteImg = sprites.gizmo_skid;
      drawW = 64;
      drawH = 72;
      offsetX = -32;
    } else if (runSpeed > 0.35) {
      // Animated Run & Full-Sprint Cycle!
      const step = Math.floor(p.animCycle) % 4;
      if (runSpeed > 6.2 && sprites.gizmo_sprint) {
        // High-speed jet-flame sprint alternates between Sprint & Run frames
        spriteImg = step % 2 === 0 ? sprites.gizmo_sprint : sprites.gizmo_run1;
        if (spriteImg === sprites.gizmo_sprint) {
          drawW = 80;
          drawH = 72;
          offsetX = -46; // Extra room on back for jet flame
        } else {
          drawW = 64;
          drawH = 72;
          offsetX = -32;
        }
      } else {
        // Normal 4-beat waddle/jog cycle: Run1 -> Run2 -> Run1 -> Idle
        if (step === 0 || step === 2) {
          spriteImg = sprites.gizmo_run1;
          drawW = 64;
          drawH = 72;
          offsetX = -32;
        } else if (step === 1) {
          spriteImg = sprites.gizmo_run2;
          drawW = 62;
          drawH = 72;
          offsetX = -31;
        } else {
          spriteImg = sprites.gizmo_idle;
          drawW = 58;
          drawH = 74;
          offsetX = -29;
        }
      }
    }

    if (assetsReady && spriteImg) {
      const idleBob = runSpeed <= 0.35 && p.grounded ? Math.sin(frameCount * 0.08) * 2 : 0;
      ctx.drawImage(spriteImg, offsetX, -drawH + 26 + squatY + idleBob, drawW, drawH);
    }
    ctx.restore();
  }

  // Draw Plasma Shield over Gizmo-Bot if active
  if (p.shield) {
    ctx.strokeStyle = frameCount % 4 < 2 ? '#00f0ff' : '#68a8ff';
    ctx.fillStyle = 'rgba(0, 225, 255, 0.2)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius + 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function drawGoalAndCapsule() {
  // End-of-Act Spinning Signpost
  const gp = goalPost;
  if (gp.x > camera.x - 100 && gp.x < camera.x + W + 100) {
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(gp.x - 3, gp.y - 58, 6, 58);

    const signW = gp.spinTimer > 0 ? Math.max(4, Math.abs(Math.cos(gp.spinTimer * 0.35)) * 32) : 32;
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(gp.x - signW, gp.y - 88, signW * 2, 34);
    ctx.strokeStyle = '#ffe600';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(gp.x - signW, gp.y - 88, signW * 2, 34);

    if (signW > 14 && assetsReady && sprites.gizmo_victory) {
      ctx.drawImage(sprites.gizmo_victory, gp.x - 14, gp.y - 86, 28, 30);
    }
  }

  // Giant Nano Banana Egg Capsule / Cyber-Prison Pod
  const cx = gp.capsuleX;
  const cy = gp.capsuleY;
  if (cx > camera.x - 150 && cx < camera.x + W + 150) {
    if (assetsReady && sprites.capsule) {
      ctx.drawImage(sprites.capsule, cx - 54, cy - 118, 108, 122);
    } else {
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(cx - 36, cy - 75, 72, 75);
    }
  }
}

function drawParticles() {
  particles.forEach((pt) => {
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
  });
}

// ----------------------------------------------------------------------------
// CLASSIC SONIC HUD, TITLE CARD & ACT CLEAR OVERLAYS
// ----------------------------------------------------------------------------
function drawHUD() {
  ctx.save();
  ctx.font = '14px "Press Start 2P", monospace';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  const mins = Math.floor(timeSeconds / 60);
  const secs = String(timeSeconds % 60).padStart(2, '0');

  ctx.fillStyle = '#ffe600';
  ctx.fillText('SCORE', 28, 36);
  ctx.fillText('TIME', 28, 62);
  ctx.fillStyle = player.rings === 0 && Math.floor(frameCount / 12) % 2 === 0 ? '#ff2244' : '#ffe600';
  ctx.fillText('RINGS', 28, 88);

  ctx.fillStyle = '#ffffff';
  ctx.fillText(String(score).padStart(6, '0'), 126, 36);
  ctx.fillText(`${mins}:${secs}`, 126, 62);
  ctx.fillText(String(player.rings).padStart(3, '0'), 126, 88);

  // Bottom-Left Gizmo-Bot Portrait Emblem
  if (assetsReady && sprites.gizmo_idle) {
    ctx.drawImage(sprites.gizmo_idle, 20, H - 62, 36, 44);
  }
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillStyle = '#ffe600';
  ctx.fillText('GIZMO-BOT', 64, H - 34);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('x 03', 64, H - 20);

  ctx.restore();
}

function drawTitleCard() {
  const slide = titleCardTimer < 35 ? (35 - titleCardTimer) * 28 : 0;
  ctx.save();
  ctx.translate(-slide, 0);

  ctx.fillStyle = 'rgba(10, 16, 36, 0.55)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#e6192e';
  ctx.fillRect(240, 0, 88, 390);

  ctx.fillStyle = '#ffe600';
  ctx.beginPath();
  ctx.moveTo(310, 320);
  ctx.lineTo(740, 260);
  ctx.lineTo(700, 365);
  ctx.closePath();
  ctx.fill();

  ctx.shadowColor = '#000000';
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#ffffff';
  ctx.font = '32px "Press Start 2P", monospace';
  ctx.fillText('CHROME HILL', 310, 225);
  ctx.fillText('ZONE', 445, 275);

  ctx.fillStyle = '#ffe600';
  ctx.font = '26px "Press Start 2P", monospace';
  ctx.fillText('ACT 1', 565, 332);

  ctx.restore();
}

function drawActClearScreen() {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 14, 34, 0.72)';
  ctx.fillRect(0, 0, W, H);

  ctx.shadowColor = '#000000';
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;

  ctx.font = '24px "Press Start 2P", monospace';
  ctx.fillStyle = '#ffe600';
  ctx.fillText('GIZMO-BOT HAS', 280, 150);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('PASSED ACT 1', 310, 192);

  ctx.font = '14px "Press Start 2P", monospace';
  ctx.fillStyle = '#ffe600';
  ctx.fillText('TIME BONUS', 270, 265);
  ctx.fillText('RING BONUS', 270, 305);
  ctx.fillText('TOTAL SCORE', 270, 355);

  ctx.fillStyle = '#ffffff';
  ctx.fillText(String(goalPost.timeBonus).padStart(6, ' '), 550, 265);
  ctx.fillText(String(goalPost.ringBonus).padStart(6, ' '), 550, 305);
  ctx.fillStyle = '#00f0ff';
  ctx.fillText(String(score).padStart(6, '0'), 550, 355);

  ctx.font = '11px "Press Start 2P", monospace';
  ctx.fillStyle = '#70ff78';
  ctx.fillText('PRESS [R] OR TAP [RESTART] TO PLAY AGAIN', 245, 435);
  ctx.restore();
}

// ----------------------------------------------------------------------------
// MAIN GAME LOOP
// ----------------------------------------------------------------------------
function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

initLevel(false);
requestAnimationFrame(gameLoop);
