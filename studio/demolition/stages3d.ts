/**
 * 3D 판 (C002~, 📐 GDD §10.5). 현장 13×13, 건물은 가운데 x 5~7 · z 5~7 둘레에 둔다. z = 0이 앞(시작 시점 쪽).
 * 수치는 초안 — 봇(funqa)으로 확정한다. C002: 1-2 네 다리 망루만(엔진이 4방향 의도를 내는지 재는 첫 판).
 */
import type { StageDef3 } from './sim3d.ts';

const W = 13, D = 13;
const EMPTY = '.'.repeat(W);
/** 가운데 3×3 평면도(앞 줄부터) → 13×13 한 층 */
const mid = (rows: string[]) => Array.from({ length: D }, (_, z) => (z >= 5 && z < 5 + rows.length ? '.....' + rows[z - 5] + '.....' : EMPTY));

export const STAGES3: StageDef3[] = [
  {
    key: 'tip4', title: '네 다리 망루', news: '↙️ 같은 쪽 다리 둘을 끊으면 그쪽으로 넘어져요', hint: '앞엔 꽃밭, 오른쪽엔 할머니 집 — 어느 쪽 다리 둘?',
    W, D,
    layers: [mid(['w.w', '...', 'w.w']), mid(['w.w', '...', 'w.w']), mid(['ppp', 'ppp', 'ppp']), mid(['ppp', 'p.p', 'ppp']), mid(['rrr', 'rrr', 'rrr'])],
    // 오른쪽(x+) 울타리가 가깝다 = 할머니 집. 앞(z−) 꽃밭
    lot: { x0: 0, x1: 9, z0: 0, z1: 12 }, goal: 3, flat: 2,
    flowers: [[5, 1], [6, 1], [7, 1], [5, 2], [6, 2], [7, 2]], charges: 2,
  },
];
