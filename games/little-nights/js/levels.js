// THE LAMP: 작은 밤들 — 스테이지 목록
//
// 지도 기호:  # 벽   . 바닥   (빈칸) 허공   D 낮의 돌   N 밤의 돌   L 등불   * 빛꽃(3)
//            S 시작   E 출구   s 그림자   w 나방   c 상자
//
// par = 빛꽃을 모두 피우고 깨는 최소 턴 수, sol = 그 풀이. 둘 다 풀이기가 계산한 값이며
// node tools/verify.mjs 가 다시 풀어서 맞는지 확인한다. 스테이지를 고쳤다면 --fix 로 값을 다시 적는다.
import { GENERATED } from './levels-gen.js';

export const CHAPTERS = [
  { id: 1, key: 'ch.1' },
  { id: 2, key: 'ch.2' },
  { id: 3, key: 'ch.3' },
  { id: 4, key: 'ch.4' },
];

// 각 장의 첫 판: 규칙을 하나씩 가르친다 (손으로 만든 것)
const HAND = [
  { chapter: 1, rows: ['S..*.', '.#.D.', '*..D*', '   .E'], par: 7, parAny: 7, sol: 'RRDDRRD', tip: 'tip.move' },
  { chapter: 1, rows: ['S.*NN.*', '.#   ..', '..*  .E'], par: 10, parAny: 9, sol: 'RRTRRRRDTD', tip: 'tip.toggle' },
  { chapter: 2, rows: ['S.*#...', '..NNN.s', '*.#.*.E'], par: 10, parAny: 9, sol: 'RDTRRRRRTD', tip: 'tip.shadow' },
  { chapter: 3, rows: ['S..L  .', '*..DN.E', '..*  *.'], par: 9, parAny: 8, sol: 'RRDRTRRTR', tip: 'tip.lantern' },
  { chapter: 4, rows: ['S.*...', '.#w#..', '..N.*E', '*.N...'], par: 11, parAny: 7, sol: 'RLDDRTRRRTR', tip: 'tip.moth' },
];

export const LEVELS = [];
for (const ch of CHAPTERS) {
  const list = [...HAND.filter((l) => l.chapter === ch.id), ...GENERATED.filter((l) => l.chapter === ch.id)];
  let crateTip = false;
  list.forEach((l, i) => {
    const lv = { ...l, id: `${ch.id}-${i + 1}` };
    if (!lv.tip && !crateTip && l.rows.join('').includes('c')) { lv.tip = 'tip.crate'; crateTip = true; }
    LEVELS.push(lv);
  });
}

export function levelIndex(id) { return LEVELS.findIndex((l) => l.id === id); }
