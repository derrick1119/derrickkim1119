// 3D 미리보기 시트(개발용). view3d.html 설명 참고.
import { Engine, PX } from '../src/render3d/engine.js';
import { THREE, mat, mesh, sphereGeo, capsuleGeo, cylGeo, coneGeo, boxGeo, addOutline, cloud3d, shadowBlob, PAL } from '../src/render3d/kit.js';

const q = new URLSearchParams(location.search);
const mode = q.get('mode') || 'demo';
const fixedT = q.has('t') ? Number(q.get('t')) : null;
const CW = Number(q.get('w')) || 390;
const CH = Number(q.get('h')) || 844;
const HUD = 150;
const DOCK = 150;
const groundY = Math.round(CH - DOCK - Math.min(Math.max(CH * 0.065, 30), 56));

const glCanvas = document.createElement('canvas');
const engine = new Engine(glCanvas);
engine.layout({ w: CW, h: CH, dpr: 1, groundY, insetTop: HUD + 30 });

const sheet = document.getElementById('sheet');
const sctx = sheet.getContext('2d');
function setupSheet(cols, rows, gap = 10) {
  sheet.width = cols * CW + (cols + 1) * gap;
  sheet.height = rows * CH + (rows + 1) * gap;
  sctx.fillStyle = '#111';
  sctx.fillRect(0, 0, sheet.width, sheet.height);
  return (i) => ({ x: gap + (i % cols) * (CW + gap), y: gap + Math.floor(i / cols) * (CH + gap) });
}
function marks(x, y, label) {
  sctx.save();
  sctx.translate(x, y);
  sctx.fillStyle = 'rgba(0,0,0,0.25)';
  sctx.fillRect(0, 0, CW, HUD);
  sctx.fillRect(0, CH - DOCK, CW, DOCK);
  sctx.strokeStyle = '#ffd23f';
  sctx.setLineDash([4, 4]);
  sctx.beginPath();
  sctx.moveTo(0, groundY);
  sctx.lineTo(CW, groundY);
  sctx.stroke();
  sctx.setLineDash([]);
  sctx.fillStyle = '#fff';
  sctx.font = 'bold 13px system-ui';
  sctx.fillText(label, 8, 18);
  sctx.restore();
}

async function demo() {
  const g = new THREE.Group();
  const ground = mesh(new THREE.PlaneGeometry(200, 200), mat(PAL.grass, { rough: 0.95 }), { cast: false, receive: true, rot: [-Math.PI / 2, 0, 0] });
  g.add(ground);
  for (let i = 0; i < 12; i++) {
    const x = -9 + i * 1.6 + Math.sin(i) * 0.5;
    const z = -4 - (i % 3) * 3;
    const tree = new THREE.Group();
    tree.add(mesh(cylGeo(0.08, 0.12, 0.8), mat(PAL.woodDark), { pos: [0, 0.4, 0] }));
    for (const [dx, dy, r] of [[0, 1.0, 0.55], [0.3, 0.85, 0.4], [-0.3, 0.9, 0.42]]) tree.add(mesh(sphereGeo(1), mat(PAL.leaf, { rough: 0.85 }), { pos: [dx, dy, 0], scale: r }));
    tree.position.set(x, 0, z);
    g.add(tree);
  }
  g.add(cloud3d([[0, 0, 0, 1.6], [1.6, -0.3, 0.2, 1.2], [-1.7, -0.4, 0, 1.1], [0.6, 0.6, -0.3, 1.2]]).translateX(-3).translateY(8).translateZ(-12));
  // 시험용 사람(캡슐 몸 + 구 머리)
  const p = new THREE.Group();
  const body = mesh(capsuleGeo(0.2, 0.5), mat('#3f6fd0'), { pos: [0, 0.3, 0] });
  addOutline(body, 0.02);
  const head = mesh(sphereGeo(0.25, 28, 20), mat(PAL.skin[0], { rough: 0.6 }), { pos: [0, 0.75, 0] });
  addOutline(head, 0.02);
  p.add(body, head, shadowBlob(0.3, 0.25));
  p.position.set(-1.5, 0, 0);
  g.add(p);
  // 시험용 기체
  const u = new THREE.Group();
  u.add(mesh(new THREE.SphereGeometry(0.8, 40, 16), mat(PAL.hull, { metal: 0.6, rough: 0.35, envIntensity: 1 }), { scale: [1, 0.28, 1] }));
  u.add(mesh(sphereGeo(0.32, 28, 20), new THREE.MeshPhysicalMaterial({ color: '#bff4ff', roughness: 0.05, transmission: 0, transparent: true, opacity: 0.45 }), { pos: [0, 0.15, 0] }));
  u.position.copy(engine.toWorld(CW / 2, 330));
  g.add(u);
  engine.setStage({ group: g, env: {}, update() {} });
  const at = setupSheet(1, 1);
  engine.render();
  const { x, y } = at(0);
  sctx.drawImage(glCanvas, x, y);
  marks(x, y, 'demo');
}

async function stages() {
  const { buildStage, STAGES } = await import('../src/render3d/stages.js');
  const at = setupSheet(4, 2);
  const t = fixedT ?? 2;
  STAGES.forEach((id, i) => {
    const st = buildStage(id, { w: CW, h: CH });
    engine.setStage(st);
    st.update?.(t, 1 / 60);
    engine.render();
    const { x, y } = at(i);
    sctx.drawImage(glCanvas, x, y);
    marks(x, y, id);
  });
}

async function actors() {
  const stageId = q.get('stage') || 'farm';
  const { buildStage } = await import('../src/render3d/stages.js').catch(() => ({}));
  const t = fixedT ?? 1.3;
  const st = buildStage ? buildStage(stageId, { w: CW, h: CH }) : { group: new THREE.Group(), env: {} };
  engine.setStage(st);
  const at = setupSheet(3, 1);
  const panels = [];
  // 1) 기체 형태 8종
  try {
    const { createUfo, UFO_TILT } = await import('../src/render3d/ufo3d.js');
    panels.push(() => {
      const items = [];
      for (let f = 0; f < 8; f++) {
        const u = createUfo(f);
        u.update({ t, mood: 'idle', lit: 1, beam: f % 2 });
        const s = (0.9 * 1.0) / u.halfWidth;
        u.root.scale.setScalar(s);
        u.root.rotation.x = UFO_TILT;
        u.root.position.copy(engine.toWorld(70 + (f % 3) * 125, 220 + Math.floor(f / 3) * 120));
        items.push(u.root);
      }
      const moods = ['idle', 'happy', 'alert', 'hide', 'shock'];
      moods.forEach((m, i) => {
        const u = createUfo(1);
        u.update({ t, mood: m, lit: m === 'hide' ? 0.05 : 1, beam: 0 });
        u.root.scale.setScalar(0.7 / u.halfWidth);
        u.root.rotation.x = UFO_TILT;
        u.root.position.copy(engine.toWorld(45 + i * 75, 600));
        items.push(u.root);
      });
      return items;
    });
  } catch (e) { console.warn('ufo3d', e.message); }
  // 2) 지구인 11종: 위 줄 걷기, 가운데 올려다보기, 아래 들킴
  try {
    const { createWatcher, WATCHER_TYPES } = await import('../src/render3d/people3d.js');
    panels.push(() => {
      const items = [];
      const types = WATCHER_TYPES;
      const rows = [{ walk: 1, look: 0 }, { walk: 0, look: 1 }, { walk: 0, look: 1, shock: true }];
      rows.forEach((pose, r) => {
        types.forEach((type, i) => {
          const wtr = createWatcher(type);
          wtr.update({ t: t + i * 0.37, dir: i % 2 ? -1 : 1, ...pose, target: engine.toWorld(CW / 2, 300) });
          const s = 0.62;
          wtr.root.scale.setScalar(s);
          const col = i % 6;
          const row = r * 2 + Math.floor(i / 6);
          const x = 36 + col * 64;
          const yScreen = 250 + row * 72;
          const p = engine.toWorld(x, yScreen);
          wtr.root.position.set(p.x, p.y, 0);
          items.push(wtr.root);
        });
      });
      return items;
    });
  } catch (e) { console.warn('people3d', e.message); }
  // 3) 표본 10종
  try {
    const { createSpecimen, SPECIMEN_KINDS } = await import('../src/render3d/specimens3d.js');
    panels.push(() => {
      const items = [];
      SPECIMEN_KINDS.forEach((kind, i) => {
        for (let k = 0; k < 2; k++) {
          const sp = createSpecimen(kind);
          sp.update(t + i, k ? -1 : 1);
          const scale = k ? 1.12 : 2.0;
          sp.root.scale.setScalar(scale);
          const x = k ? 40 + (i % 5) * 75 : 60 + (i % 3) * 130;
          const y = k ? 520 + Math.floor(i / 5) * 60 : 200 + Math.floor(i / 3) * 75;
          sp.root.position.copy(engine.toWorld(x, y));
          items.push(sp.root);
        }
      });
      return items;
    });
  } catch (e) { console.warn('specimens3d', e.message); }
  panels.forEach((make, i) => {
    const items = make();
    for (const it of items) engine.actors.add(it);
    st.update?.(t, 1 / 60);
    engine.render();
    const { x, y } = at(i);
    sctx.drawImage(glCanvas, x, y);
    marks(x, y, ['ufo', 'people', 'specimens'][i] || '');
    for (const it of items) engine.actors.remove(it);
  });
}

const run = { demo, stages, actors }[mode] || demo;
run()
  .catch((e) => {
    console.error(e);
    document.body.append(String(e.stack || e));
  })
  .finally(() => {
    document.body.dataset.ready = '1';
  });
