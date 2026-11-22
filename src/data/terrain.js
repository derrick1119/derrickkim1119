// 싸움터의 지형과 하늘. 싸움이 시작되면 종이 무대 장치처럼 세워졌다가 끝나면 접힌다
// 장애물: wall·barricade·water = 네모(x,y,w,h), rock·tree·pillar = 동그라미(x,y,r).  slow = 걸음이 느려지는 얕은 물
import { VIEW, MID_Y } from '../config.js';

const T = VIEW.y0, B = VIEW.y1;
export const TERRAINS = {
  open: { name: '트인 길', tip: '', obstacles: [] },
  rocks: { name: '바위 고개', tip: '바위가 길을 가른다', obstacles: [{ kind: 'rock', x: 650, y: 236, r: 26, v: 1 }, { kind: 'rock', x: 770, y: 440, r: 30, v: 2 }, { kind: 'rock', x: 560, y: 470, r: 20, v: 3 }] },
  gate: { name: '돌담 길목', tip: '가운데 좁은 길목으로 몰려든다. 막아 세우기 좋다', obstacles: [{ kind: 'wall', x: 706, y: T - 6, w: 30, h: 128 }, { kind: 'wall', x: 706, y: B - 122, w: 30, h: 128 }] },
  bridge: { name: '다리목', tip: '개울을 건너는 길은 다리 둘과 여울 하나', obstacles: [{ kind: 'water', x: 722, y: T - 10, w: 56, h: 66 }, { kind: 'water', x: 722, y: 274, w: 56, h: 60 }, { kind: 'water', x: 722, y: 396, w: 56, h: 10 }, { kind: 'water', x: 722, y: 490, w: 56, h: 70 }],
    bridges: [{ x: 712, y: 190, w: 76, h: 84 }, { x: 712, y: 406, w: 76, h: 84 }], slow: [{ x: 712, y: 334, w: 76, h: 62 }], river: { x: 722, w: 56 } },
  grove: { name: '숲길', tip: '나무 사이로 흩어져 들어온다', obstacles: [{ kind: 'tree', x: 600, y: 200, r: 15, v: 1 }, { kind: 'tree', x: 700, y: 300, r: 15, v: 2 }, { kind: 'tree', x: 610, y: 410, r: 15, v: 3 }, { kind: 'tree', x: 800, y: 210, r: 15, v: 4 }, { kind: 'tree', x: 820, y: 420, r: 15, v: 5 }, { kind: 'tree', x: 720, y: 500, r: 15, v: 6 }, { kind: 'tree', x: 900, y: 320, r: 15, v: 7 }] },
  palisade: { name: '목책 진지', tip: '목책 뒤에서 버티기 좋다', obstacles: [{ kind: 'barricade', x: 566, y: T + 6, w: 16, h: 112 }, { kind: 'barricade', x: 566, y: B - 118, w: 16, h: 112 }, { kind: 'barricade', x: 640, y: MID_Y - 44, w: 16, h: 88 }] },
  arena: { name: '두목의 마당', tip: '', obstacles: [{ kind: 'pillar', x: 560, y: 190, r: 14, v: 1 }, { kind: 'pillar', x: 560, y: 500, r: 14, v: 2 }, { kind: 'pillar', x: 960, y: 190, r: 14, v: 3 }, { kind: 'pillar', x: 960, y: 500, r: 14, v: 4 }] },
};
for (const k of Object.keys(TERRAINS)) TERRAINS[k].id = k;
const POOL = [['open', 'open', 'rocks', 'gate', 'palisade'], ['grove', 'grove', 'bridge', 'rocks', 'gate', 'open'], ['gate', 'bridge', 'palisade', 'rocks', 'open']];
export const pickTerrain = (ch, R) => POOL[ch][(R() * POOL[ch].length) | 0];

// 하늘: 낮 / 밤 / 비
export const SKY = {
  day: { name: '맑은 날', ch: '낮', desc: '' },
  night: { name: '밤', ch: '밤', desc: '망령·도깨비불 공격력·속도 +20%, 아군 원거리 사거리 -12% (횃불로 해제)' },
  rain: { name: '비', ch: '비', desc: '불 공격 -30%·화상 없음, 조총은 셋에 한 번 불발, 벼락 +30%' },
};
const SKY_P = [[0.7, 0.15], [0.5, 0.2], [0.2, 0.5]]; // [낮, 밤] 확률 (나머지는 비)
export function pickSky(ch, R) { const x = R(), p = SKY_P[ch]; return x < p[0] ? 'day' : x < p[0] + p[1] ? 'night' : 'rain'; }
