/* =============================================================
   vr_components.js  -  A-Frame custom components
   Zero external texture dependencies: all planet surfaces are
   generated procedurally on a Canvas so the scenes work fully
   offline and never 404.
   ============================================================= */

/* ─────────────────────────────────────────────────────────────
   PROCEDURAL TEXTURE HELPERS
   Each function returns a THREE.CanvasTexture.
   ───────────────────────────────────────────────────────────── */

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/** Simple 2-D value noise (returns 0-1) */
function noise2(x, y, seed) {
  const s = seed || 1;
  return (Math.sin(x * 127.1 * s + y * 311.7) * 43758.5453) % 1;
}

/** Smooth noise via bilinear interpolation of value noise */
function smoothNoise(x, y, scale, seed) {
  const xi = Math.floor(x * scale), yi = Math.floor(y * scale);
  const xf = (x * scale) - xi, yf = (y * scale) - yi;
  const n00 = Math.abs(noise2(xi,   yi,   seed));
  const n10 = Math.abs(noise2(xi+1, yi,   seed));
  const n01 = Math.abs(noise2(xi,   yi+1, seed));
  const n11 = Math.abs(noise2(xi+1, yi+1, seed));
  return n00*(1-xf)*(1-yf) + n10*xf*(1-yf) + n01*(1-xf)*yf + n11*xf*yf;
}

function fbm(x, y, octaves, seed) {
  let v = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) {
    v += smoothNoise(x, y, freq * 3, seed + i * 17) * amp;
    amp *= 0.5; freq *= 2;
  }
  return v;
}

/* ── Moon ── */
function makeMoonTexture() {
  const W = 512, H = 256, c = makeCanvas(W, H), ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = fbm(x/W, y/H, 5, 3);
    const v = Math.floor(130 + n * 80);
    const i = (y*W + x)*4;
    img.data[i] = v; img.data[i+1] = v; img.data[i+2] = v; img.data[i+3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  // craters
  [[0.3,0.4,18],[0.7,0.6,12],[0.5,0.3,22],[0.2,0.7,10],[0.8,0.2,8]].forEach(([cx,cy,r]) => {
    const px = cx*W, py = cy*H;
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(80,80,80,0.6)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(px, py, r*0.7, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(100,100,100,0.3)'; ctx.fill();
  });
  return new THREE.CanvasTexture(c);
}

/* ── Earth ── */
function makeEarthTexture() {
  const W = 512, H = 256, c = makeCanvas(W, H), ctx = c.getContext('2d');
  // Ocean base
  ctx.fillStyle = '#1a4a8a'; ctx.fillRect(0, 0, W, H);
  const img = ctx.createImageData(W, H);
  ctx.getImageData(0,0,W,H).data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = fbm(x/W*2, y/H*2, 6, 7);
    const i = (y*W+x)*4;
    if (n > 0.52) { // land
      const g = Math.floor(60 + n*120);
      img.data[i]=40; img.data[i+1]=g; img.data[i+2]=20;
    } else { // ocean
      const b = Math.floor(80 + n*120);
      img.data[i]=10; img.data[i+1]=40; img.data[i+2]=b;
    }
    img.data[i+3]=255;
  }
  ctx.putImageData(img, 0, 0);
  // polar ice caps
  const topGrad = ctx.createLinearGradient(0,0,0,30);
  topGrad.addColorStop(0,'rgba(240,248,255,1)'); topGrad.addColorStop(1,'rgba(240,248,255,0)');
  ctx.fillStyle = topGrad; ctx.fillRect(0,0,W,30);
  const botGrad = ctx.createLinearGradient(0,H-25,0,H);
  botGrad.addColorStop(0,'rgba(240,248,255,0)'); botGrad.addColorStop(1,'rgba(240,248,255,1)');
  ctx.fillStyle = botGrad; ctx.fillRect(0,H-25,W,25);
  return new THREE.CanvasTexture(c);
}

/* ── Saturn ── */
function makeSaturnTexture() {
  const W = 512, H = 256, c = makeCanvas(W, H), ctx = c.getContext('2d');
  const bands = [
    [0,'#C9A866'],[0.1,'#D4B87A'],[0.2,'#C4A060'],[0.3,'#DDBE88'],
    [0.45,'#C8A070'],[0.55,'#D8B87C'],[0.65,'#BF9858'],[0.75,'#D2AD74'],
    [0.85,'#C5A062'],[1,'#C9A866']
  ];
  for (let y = 0; y < H; y++) {
    const t = y/H;
    let col = '#C9A866';
    for (let b = 0; b < bands.length-1; b++) {
      if (t >= bands[b][0] && t < bands[b+1][0]) { col = bands[b][1]; break; }
    }
    ctx.fillStyle = col;
    ctx.fillRect(0, y, W, 1);
  }
  // subtle noise
  const img = ctx.getImageData(0,0,W,H);
  for (let i = 0; i < img.data.length; i+=4) {
    const jit = (Math.random()-0.5)*10;
    img.data[i]   = Math.min(255,Math.max(0,img.data[i]+jit));
    img.data[i+1] = Math.min(255,Math.max(0,img.data[i+1]+jit));
  }
  ctx.putImageData(img, 0, 0);
  return new THREE.CanvasTexture(c);
}

/* ── Saturn Ring ── */
function makeSaturnRingTexture() {
  const W = 256, H = 4, c = makeCanvas(W, H), ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0,0,W,0);
  g.addColorStop(0,   'rgba(180,160,120,0.0)');
  g.addColorStop(0.1, 'rgba(200,178,138,0.9)');
  g.addColorStop(0.25,'rgba(220,195,150,0.7)');
  g.addColorStop(0.4, 'rgba(180,160,120,0.5)');
  g.addColorStop(0.55,'rgba(210,188,145,0.85)');
  g.addColorStop(0.7, 'rgba(190,170,130,0.6)');
  g.addColorStop(0.85,'rgba(160,142,108,0.4)');
  g.addColorStop(1,   'rgba(140,124,95,0.0)');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  return new THREE.CanvasTexture(c);
}

/* ── Jupiter ── */
function makeJupiterTexture() {
  const W = 512, H = 256, c = makeCanvas(W, H), ctx = c.getContext('2d');
  const bandColors = [
    '#C9956A','#E8C9A0','#C08050','#DDBB90','#A87048',
    '#E0C090','#C89060','#DDB880','#B87848','#E0C898'
  ];
  for (let y = 0; y < H; y++) {
    const band = Math.floor((y/H)*bandColors.length);
    ctx.fillStyle = bandColors[band % bandColors.length];
    ctx.fillRect(0, y, W, 1);
  }
  // turbulent streaks
  for (let i = 0; i < 40; i++) {
    const y = Math.random()*H, w = 30+Math.random()*120, x = Math.random()*W;
    ctx.fillStyle = `rgba(${Math.floor(160+Math.random()*60)},${Math.floor(100+Math.random()*60)},${Math.floor(40+Math.random()*40)},0.25)`;
    ctx.fillRect(x, y, w, 2+Math.random()*3);
  }
  // Great Red Spot
  ctx.beginPath(); ctx.ellipse(W*0.65, H*0.55, 28, 16, 0, 0, Math.PI*2);
  ctx.fillStyle='rgba(180,60,30,0.7)'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(W*0.65, H*0.55, 20, 10, 0, 0, Math.PI*2);
  ctx.fillStyle='rgba(200,80,40,0.5)'; ctx.fill();
  return new THREE.CanvasTexture(c);
}

/* ── Mars ── */
function makeMarsTexture() {
  const W = 512, H = 256, c = makeCanvas(W, H), ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = fbm(x/W*2, y/H*2, 5, 13);
    const i = (y*W+x)*4;
    img.data[i]   = Math.floor(160 + n*70);
    img.data[i+1] = Math.floor(60  + n*30);
    img.data[i+2] = Math.floor(20  + n*20);
    img.data[i+3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  // polar ice
  const g = ctx.createLinearGradient(0,0,0,20);
  g.addColorStop(0,'rgba(240,230,220,0.85)'); g.addColorStop(1,'rgba(240,230,220,0)');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,20);
  return new THREE.CanvasTexture(c);
}

/* ── Starfield ── */
function makeStarfieldTexture() {
  const W = 1024, H = 512, c = makeCanvas(W, H), ctx = c.getContext('2d');
  ctx.fillStyle = '#000005'; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 2000; i++) {
    const x = Math.random()*W, y = Math.random()*H;
    const r = Math.random()*1.5;
    const a = 0.3 + Math.random()*0.7;
    const hue = Math.random() < 0.8 ? 'rgba(255,255,255,' : (Math.random()<0.5 ? 'rgba(200,220,255,' : 'rgba(255,220,180,');
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2);
    ctx.fillStyle = hue + a + ')'; ctx.fill();
  }
  return new THREE.CanvasTexture(c);
}

/* ─────────────────────────────────────────────────────────────
   INJECT TEXTURES into A-Frame's asset system before scenes use them.
   We create THREE textures and store them on window so any
   component can grab them; we also patch A-Frame's material
   system by registering a "pro-tex" component that applies
   the right canvas texture to whichever entity needs it.
   ───────────────────────────────────────────────────────────── */

// Generate all textures once at startup
window._vrTex = {};
document.addEventListener('DOMContentLoaded', function () {
  window._vrTex = {
    moon:        makeMoonTexture(),
    earth:       makeEarthTexture(),
    saturn:      makeSaturnTexture(),
    saturnRing:  makeSaturnRingTexture(),
    jupiter:     makeJupiterTexture(),
    mars:        makeMarsTexture(),
    starfield:   makeStarfieldTexture()
  };
  // Mark A-Frame assets as already loaded so the scene never blocks
  const assetsEl = document.querySelector('a-assets');
  if (assetsEl) {
    // Remove img children - we don't need them anymore
    assetsEl.querySelectorAll('img').forEach(function(img){ img.remove(); });
  }
});

/**
 * pro-tex
 * Applies a procedural canvas texture to an entity's mesh.
 * Usage: <a-sphere pro-tex="name: moon">
 * Names: moon | earth | saturn | saturnRing | jupiter | mars | starfield
 */
AFRAME.registerComponent('pro-tex', {
  schema: { name: { type: 'string', default: '' } },
  init: function () { this._apply(); },
  _apply: function () {
    const name = this.data.name;
    const apply = () => {
      const tex = window._vrTex[name];
      if (!tex) return;
      const mesh = this.el.getObject3D('mesh');
      if (!mesh) return;
      mesh.traverse(function(obj) {
        if (obj.isMesh && obj.material) {
          obj.material.map = tex;
          obj.material.needsUpdate = true;
        }
      });
    };
    // Try immediately, then wait for mesh to be ready
    apply();
    this.el.addEventListener('object3dset', apply);
  }
});


/* ─────────────────────────────────────────────────────────────
   irregular-asteroid
   ───────────────────────────────────────────────────────────── */
AFRAME.registerComponent('irregular-asteroid', {
  schema: {
    radius:       { type: 'number', default: 4 },
    detail:       { type: 'number', default: 3 },
    displacement: { type: 'number', default: 0.4 },
    seed:         { type: 'number', default: 1 }
  },
  init: function () {
    const { radius, detail, displacement, seed } = this.data;
    const geometry = new THREE.IcosahedronGeometry(radius, detail);
    const positionAttr = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    for (let i = 0; i < positionAttr.count; i++) {
      vertex.fromBufferAttribute(positionAttr, i);
      const dir = vertex.clone().normalize();
      const n =
        Math.sin((dir.x + seed) * 2.1) * 0.5 +
        Math.sin((dir.y + seed * 1.7) * 3.3) * 0.3 +
        Math.sin((dir.z + seed * 2.3) * 1.7) * 0.4;
      vertex.multiplyScalar(1 + n * displacement);
      positionAttr.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({
      color: '#9C8B7A', roughness: 1, metalness: 0.05, flatShading: true
    });
    this.el.setObject3D('mesh', new THREE.Mesh(geometry, material));
  },
  remove: function () { this.el.removeObject3D('mesh'); }
});


/* ─────────────────────────────────────────────────────────────
   face-camera
   ───────────────────────────────────────────────────────────── */
AFRAME.registerComponent('face-camera', {
  tick: function () {
    const cam = this.el.sceneEl.camera;
    if (!cam) return;
    const pos = new THREE.Vector3();
    cam.getWorldPosition(pos);
    this.el.object3D.lookAt(pos);
  }
});


/* ─────────────────────────────────────────────────────────────
   particle-system
   ───────────────────────────────────────────────────────────── */
AFRAME.registerComponent('particle-system', {
  schema: {
    preset:        { type: 'string', default: '' },
    color:         { type: 'string', default: '#FFFFFF' },
    particleCount: { type: 'int',    default: 500 },
    size:          { type: 'string', default: '0.05' },
    positionSpread:{ type: 'string', default: '20 20 20' },
    blending:      { type: 'string', default: 'normal' },
    velocityValue: { type: 'string', default: '0 0 0' },
    velocitySpread:{ type: 'string', default: '0 0 0' },
    maxAge:        { type: 'string', default: '99999' },
    opacity:       { type: 'number', default: 0.86 }
  },
  init: function () {
    const d = this.data;
    const count = Math.max(1, Math.min(d.particleCount, 5000));
    let sx = 20, sy = 20, sz = 20;
    if (typeof d.positionSpread === 'string') {
      const p = d.positionSpread.trim().split(/\s+/).map(Number);
      if (p.length === 3 && p.every(Number.isFinite)) { sx=p[0]; sy=p[1]; sz=p[2]; }
    } else if (d.positionSpread && typeof d.positionSpread === 'object') {
      sx = d.positionSpread.x||20; sy = d.positionSpread.y||20; sz = d.positionSpread.z||20;
    }
    const positions = new Float32Array(count * 3);
    const colors    = new Float32Array(count * 3);
    const palette   = d.color.split(',').map(v=>v.trim()).filter(Boolean);
    for (let i = 0; i < count; i++) {
      positions[i*3]   = (Math.random()-0.5)*sx;
      positions[i*3+1] = (Math.random()-0.5)*sy;
      positions[i*3+2] = (Math.random()-0.5)*sz;
      const col = new THREE.Color(palette[i % palette.length] || '#FFFFFF');
      colors[i*3]=col.r; colors[i*3+1]=col.g; colors[i*3+2]=col.b;
    }
    const sizes = d.size.split(',').map(v=>parseFloat(v.trim())).filter(Number.isFinite);
    const pointSize = sizes.length ? Math.max(...sizes) : 0.05;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors,    3));
    const mat = new THREE.PointsMaterial({
      size: pointSize, vertexColors: true, transparent: true,
      opacity: d.opacity, depthWrite: false, sizeAttenuation: true,
      blending: d.blending === 'additive' ? THREE.AdditiveBlending : THREE.NormalBlending
    });
    this.points = new THREE.Points(geo, mat);
    this.el.setObject3D('particles', this.points);
  },
  remove: function () { this.el.removeObject3D('particles'); }
});