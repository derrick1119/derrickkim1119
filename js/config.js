// THE LAMP: 마지막 불씨 — 튜닝 데이터 (게임 로직은 game.js)
// 숫자를 바꾸면 tools/sim.mjs 로 밸런스를 다시 확인할 수 있습니다.

export const GAME_TITLE = 'THE LAMP';
export const SAVE_KEY = 'thelamp.lastember.v1';

export const WORLD = { w: 3400, h: 3400 };

export const BASE = {
  playerR: 11,
  maxOil: 100,
  lightR: 235,          // 램프를 켰을 때 기본 빛 반경
  darkR: 56,            // 램프를 껐을 때 남는 희미한 반경
  speed: 182,
  darkSpeedMul: 1.22,   // 어둠 속에서는 더 빠르다
  drain: 0.5,           // 램프가 켜져 있을 때 초당 기름 소모
  drainFloor: 0.1,      // 소모만으로는 이 비율 아래로 내려가지 않는다
  magnet: 70,
  darkMagnetMul: 3.4,   // 어둠 속에서는 불씨가 멀리서도 끌려온다
  chargeTime: 3.2,      // 어둠 속에서 섬광이 가득 차는 시간
  toggleCd: 0.35,
  iframes: 0.75,
  flareDmg: 36,
  levelDmg: 0.02,       // 레벨이 오를 때마다 모든 피해 +2% (어느 빌드든 후반까지 따라가도록)
  flareR: 115,
  flareRCharge: 115,
  flareStun: 0.55,
  flareMinCharge: 0.15,
  loseTrackTime: 0.45,  // 램프를 끄고 이만큼 지나면 적이 놓친다
  senseR: 66,           // 이 안으로 들어오면 어둠 속에서도 들킨다
  darkDmgMul: 1.25,     // 어둠 속에서 맞으면 더 아프다
  lampR: 178,           // 켜진 가로등의 빛 반경
  lampBurn: 7,          // 가로등 불빛에 날아든 나방이 받는 초당 피해
  lampSlow: 0.8,        // 가로등 빛 안에서 그림자의 이동 속도 배율
  guardWakeDark: 62,    // 램프를 끈 채로는 이 거리까지 다가가야 수호 그림자가 깬다
  lampRegen: 3.0,       // 가로등 빛 안에서 초당 기름 회복 (빛 안에 그림자가 없을 때)
  lampIgniteTime: 1.5,
  lampIgniteDist: 58,
  maxEnemies: 240,
  maxPickups: 360,
};

// kind: chaser | moth | stalker | spitter | snuffer | boss
export const ENEMIES = {
  soot:    { kind: 'chaser',  hp: 10,   speed: 92,  r: 11, dmg: 7,  xp: 1,  kb: 1.0 },
  moth:    { kind: 'moth',    hp: 6,    speed: 140, r: 8,  dmg: 5,  xp: 1,  kb: 1.4 },
  stalker: { kind: 'stalker', hp: 30,   speed: 205, r: 13, dmg: 14, xp: 3,  kb: 0.6 },
  spitter: { kind: 'spitter', hp: 26,   speed: 62,  r: 12, dmg: 8,  xp: 4,  kb: 0.9 },
  brute:   { kind: 'chaser',  hp: 130,  speed: 46,  r: 22, dmg: 19, xp: 9,  kb: 0.25, charge: true },
  snuffer: { kind: 'snuffer', hp: 42,   speed: 74,  r: 13, dmg: 9,  xp: 5,  kb: 0.7, lampImmune: true },
  eclipse: { kind: 'boss',    hp: 2600, speed: 50,  r: 46, dmg: 26, xp: 150, kb: 0, lampImmune: true },
};

// 밤(스테이지) 정의. duration = 새벽까지 걸리는 시간(초)
export const NIGHTS = [
  { id: 1, duration: 420, lamps: 8,  hpMul: 1.0,  spdMul: 1.0,  dmgMul: 1.0,  spawnMul: 1.0,  bossAt: 330, bossHp: 1.0, snuffers: false, requireBoss: false, tides: [150, 262] },
  { id: 2, duration: 450, lamps: 9,  hpMul: 1.35, spdMul: 1.05, dmgMul: 1.15, spawnMul: 1.12, bossAt: 350, bossHp: 1.6, snuffers: true,  requireBoss: false, tides: [120, 215, 300] },
  { id: 3, duration: 480, lamps: 10, hpMul: 1.8,  spdMul: 1.08, dmgMul: 1.28, spawnMul: 1.2,  bossAt: 370, bossHp: 3.2, snuffers: true,  requireBoss: true,  tides: [100, 190, 270, 330] },
  { id: 4, duration: 510, lamps: 11, hpMul: 2.35, spdMul: 1.11, dmgMul: 1.45, spawnMul: 1.3,  bossAt: 390, bossHp: 5.0, snuffers: true,  requireBoss: true,  tides: [90, 170, 240, 300, 350] },
  { id: 5, duration: 540, lamps: 12, hpMul: 3.0,  spdMul: 1.14, dmgMul: 1.65, spawnMul: 1.4,  bossAt: 400, bossHp: 7.5, snuffers: true,  requireBoss: true,  tides: [80, 150, 210, 270, 320, 365] },
];

export function xpForLevel(l) {
  return Math.floor(5 + 3.2 * l + 0.16 * l * l);
}

// 시간에 따른 초당 스폰 수와 체력 배율
export function spawnRate(t, night) {
  return (0.7 + t / 46) * night.spawnMul;
}
// 밤이 깊을수록 그림자가 빨라진다
export function speedScale(t, night) {
  return (1 + 0.3 * Math.min(1, t / night.duration)) * night.spdMul;
}
export function hpScale(t, night) {
  return (1 + t / 140) * night.hpMul;
}

// ---------- 런 업그레이드 ----------
// type: weapon(빛) | dark(어둠) | passive
export const UPG = {
  spark: {
    type: 'weapon', max: 6,
    lv: [
      { d: 10, cd: 0.55, n: 1, p: 0 },
      { d: 13, cd: 0.55, n: 1, p: 0 },
      { d: 13, cd: 0.52, n: 2, p: 0 },
      { d: 16, cd: 0.52, n: 2, p: 1 },
      { d: 20, cd: 0.46, n: 2, p: 1 },
      { d: 24, cd: 0.44, n: 3, p: 1 },
    ],
  },
  halo: {
    type: 'weapon', max: 5,
    lv: [
      { n: 2, d: 8, r: 60 },
      { n: 3, d: 9, r: 62 },
      { n: 3, d: 12, r: 66 },
      { n: 4, d: 14, r: 72 },
      { n: 5, d: 17, r: 78 },
    ],
  },
  lance: {
    type: 'weapon', max: 5,
    lv: [
      { d: 30, cd: 2.8, n: 1, w: 20 },
      { d: 44, cd: 2.8, n: 1, w: 20 },
      { d: 46, cd: 2.2, n: 1, w: 22 },
      { d: 52, cd: 2.2, n: 2, w: 22 },
      { d: 72, cd: 2.0, n: 2, w: 28 },
    ],
  },
  trail: {
    type: 'weapon', max: 5,
    lv: [
      { dps: 14, r: 22, life: 2.2 },
      { dps: 20, r: 22, life: 2.2 },
      { dps: 20, r: 24, life: 3.2 },
      { dps: 25, r: 30, life: 3.2 },
      { dps: 34, r: 32, life: 3.4 },
    ],
  },
  flare: { type: 'dark', max: 5 },
  echo: {
    type: 'dark', max: 5,
    lv: [
      { d: 60, r: 115, lure: 2.4, cd: 5.5 },
      { d: 90, r: 115, lure: 2.4, cd: 5.5 },
      { d: 100, r: 145, lure: 3.0, cd: 5.5 },
      { d: 115, r: 145, lure: 3.0, cd: 4.2 },
      { d: 170, r: 170, lure: 3.2, cd: 3.8 },
    ],
  },
  moonbolt: {
    type: 'dark', max: 5,
    lv: [
      { n: 4, d: 30 },
      { n: 5, d: 38 },
      { n: 6, d: 48 },
      { n: 8, d: 56 },
      { n: 10, d: 70 },
    ],
  },
  wick:   { type: 'passive', max: 5 },
  tank:   { type: 'passive', max: 5 },
  boots:  { type: 'passive', max: 5 },
  magnet: { type: 'passive', max: 5 },
  trim:   { type: 'passive', max: 5 },
  heat:   { type: 'passive', max: 5 },
  hands:  { type: 'passive', max: 5 },
  dusk:   { type: 'passive', max: 5 },
  shade:  { type: 'passive', max: 5 },
  luck:   { type: 'passive', max: 5 },
};

// 각성: 무기를 끝까지 올리고 짝이 되는 패시브를 갖고 있으면 등장
export const EVO = {
  sunspark:  { from: 'spark', needs: 'heat' },
  corona:    { from: 'halo',  needs: 'wick' },
  supernova: { from: 'flare', needs: 'dusk' },
};

// ---------- 영구 업그레이드 (등불 공방) ----------
export const META = {
  glass:  { max: 5, cost: [30, 60, 110, 180, 280] },   // 최대 기름 +10
  wick:   { max: 5, cost: [30, 60, 110, 180, 280] },   // 빛 반경 +4%
  hand:   { max: 5, cost: [40, 80, 140, 220, 340] },   // 피해 +5%
  feet:   { max: 5, cost: [25, 50, 90, 150, 230] },    // 이동 속도 +3%
  ember:  { max: 5, cost: [35, 70, 120, 200, 300] },   // 경험치 +5%
  reroll: { max: 3, cost: [60, 150, 300] },            // 다시 고르기 +1
  purse:  { max: 5, cost: [40, 90, 160, 250, 380] },   // 루멘 획득 +10%
  revive: { max: 1, cost: [450] },                     // 한 번 되살아남
};
