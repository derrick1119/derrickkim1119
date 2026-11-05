/**
 * 원자(Atom) 목록 — 이미 세상에 있는 퍼즐 장르·개념에서 규칙 한 조각씩만 떼어낸 것.
 * 발견 공장은 새 규칙을 "발명"하지 않는다. 이 조각들을 조합해서 아무도 시험해보지 않은
 * 조합 중 잘 작동하는 것을 "발견"한다.
 *
 * ⚠️ 원자의 의미(제약 생성 방식)는 한번 출시되면 바꾸지 않는다. 이미 출시된 퍼즐이 깨진다.
 *    바꾸고 싶으면 새 id로 새 원자를 추가한다.
 */
import { ring } from '../engine/rules/echo.ts';
import type { CardConstraint } from '../engine/types.ts';

export type AtomRole = 'cell' | 'edge' | 'global';

export interface Atom {
  id: string;
  role: AtomRole;
  /** 짧은 한국어 이름 (UI·힌트) */
  name: string;
  /** 영감을 준 기존 장르/개념 — 발견 카드에 "재료 출처"로 표기 */
  origin: string;
  /** 발견한 조합에 이름을 붙일 때 쓰는 단어 */
  word: string;
  /** 플레이어용 규칙 문장 */
  rule: string;
  /** cell 원자: 단서가 세는 칸들 (givens는 없음) */
  scope?(cell: number, w: number, h: number): number[];
  /** global 원자: 판 전체 제약 */
  constraints?(w: number, h: number): CardConstraint[];
  /** global 원자: 지역 제약으로 못 쓰는 규칙(연결성 등). 부분 상태에서 확실히 위반이면 false */
  globalCheck?(state: Int8Array, w: number, h: number): boolean;
  /** 이 원자가 판 크기를 요구하면 false */
  fits?(w: number, h: number): boolean;
  /** single 단계 힌트 문장 */
  hint(value: 0 | 1, clue?: number | null): string;
}

const xy = (i: number, w: number) => [i % w, Math.floor(i / w)] as const;

function offsets(cell: number, w: number, h: number, deltas: [number, number][]): number[] {
  const [x, y] = xy(cell, w);
  const out: number[] = [];
  for (const [dx, dy] of deltas) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < w && ny < h) out.push(ny * w + nx);
  }
  return out;
}

function rays(cell: number, w: number, h: number, dirs: [number, number][]): number[] {
  const [x, y] = xy(cell, w);
  const out: number[] = [];
  for (const [dx, dy] of dirs) {
    let nx = x + dx, ny = y + dy;
    while (nx >= 0 && ny >= 0 && nx < w && ny < h) {
      out.push(ny * w + nx);
      nx += dx;
      ny += dy;
    }
  }
  return out;
}

const KING: [number, number][] = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
const ORTH: [number, number][] = [[0, -1], [-1, 0], [1, 0], [0, 1]];
const KNIGHT: [number, number][] = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const DIAG: [number, number][] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

const countHint = (what: string) => (v: 0 | 1, clue?: number | null) =>
  v === 0
    ? `숫자 ${clue ?? ''}이(가) 세는 칸(${what})에 이미 그만큼 칠해졌어요. 나머지는 비어 있어야 합니다.`
    : `숫자 ${clue ?? ''}을(를) 채우려면 ${what} 중 남은 칸을 모두 칠해야 해요.`;

function lines(w: number, h: number): number[][] {
  const out: number[][] = [];
  for (let y = 0; y < h; y++) out.push([...Array(w).keys()].map((x) => y * w + x));
  for (let x = 0; x < w; x++) out.push([...Array(h).keys()].map((y) => y * w + x));
  return out;
}

/** 부분 상태 연결성: target 색으로 확정된 칸들이 "target이 될 수 있는 칸"을 통해 하나로 이어지는가 */
export function connectedPartial(state: Int8Array, w: number, h: number, target: 0 | 1): boolean {
  let start = -1, known = 0;
  for (let i = 0; i < state.length; i++) if (state[i] === target) (known++, start < 0 && (start = i));
  if (known <= 1) return true;
  const seen = new Uint8Array(state.length);
  const q = [start];
  seen[start] = 1;
  let reached = 0;
  while (q.length) {
    const c = q.pop()!;
    if (state[c] === target) reached++;
    for (const n of offsets(c, w, h, ORTH)) {
      if (!seen[n] && state[n] !== 1 - target) {
        seen[n] = 1;
        q.push(n);
      }
    }
  }
  return reached === known;
}

export const ATOMS: Record<string, Atom> = {
  // ── 단서 원자: 칸에 숫자(또는 정답 일부)를 둔다 ─────────────────────────────
  givens: {
    id: 'givens', role: 'cell', name: '미리 보인 칸', origin: '스도쿠·타쿠주 (정답 일부 공개)', word: '흔적',
    rule: '처음부터 칠해져 있거나 비어 있는 칸(잠금)은 정답의 일부입니다.',
    hint: () => '잠긴 칸은 정답이에요.',
  },
  nb8: {
    id: 'nb8', role: 'cell', name: '이웃 8칸', origin: '지뢰찾기', word: '지뢰',
    rule: '숫자 = 둘러싼 8칸 중 칠한 칸 수. 숫자 칸은 칠하지 않습니다.',
    scope: (c, w, h) => offsets(c, w, h, KING), hint: countHint('둘러싼 8칸'),
  },
  orth4: {
    id: 'orth4', role: 'cell', name: '십자 4칸', origin: '여러 개수 단서 퍼즐', word: '십자',
    rule: '숫자 = 상하좌우 4칸 중 칠한 칸 수. 숫자 칸은 칠하지 않습니다.',
    scope: (c, w, h) => offsets(c, w, h, ORTH), hint: countHint('상하좌우 4칸'),
  },
  knight: {
    id: 'knight', role: 'cell', name: '나이트 도약', origin: '체스 나이트', word: '도약',
    rule: '숫자 = 체스 나이트가 한 번에 뛰어갈 수 있는 칸(최대 8칸) 중 칠한 칸 수. 숫자 칸은 칠하지 않습니다.',
    scope: (c, w, h) => offsets(c, w, h, KNIGHT), hint: countHint('나이트가 뛰는 칸'),
  },
  rook: {
    id: 'rook', role: 'cell', name: '룩의 시선', origin: '체스 룩', word: '시선',
    rule: '숫자 = 같은 가로줄과 세로줄 전체(자기 칸 제외)에서 칠한 칸 수. 숫자 칸은 칠하지 않습니다.',
    scope: (c, w, h) => rays(c, w, h, ORTH), hint: countHint('같은 가로·세로줄'),
  },
  bishop: {
    id: 'bishop', role: 'cell', name: '비숍의 사선', origin: '체스 비숍', word: '사선',
    rule: '숫자 = 그 칸을 지나는 두 대각선 위에서 칠한 칸 수. 숫자 칸은 칠하지 않습니다.',
    scope: (c, w, h) => rays(c, w, h, DIAG), hint: countHint('두 대각선'),
  },
  echo2: {
    id: 'echo2', role: 'cell', name: '두 칸 너머 고리', origin: '발명 공장의 메아리', word: '메아리',
    rule: '숫자 = 정확히 두 칸 떨어진 고리(5×5 테두리) 안의 칠한 칸 수. 숫자 칸은 칠하지 않습니다.',
    scope: (c, w, h) => ring(c, w, h, 2), hint: countHint('두 칸 너머 고리'),
  },

  // ── 가장자리 원자 ────────────────────────────────────────────────────────
  rowcol: {
    id: 'rowcol', role: 'edge', name: '줄 개수', origin: '텐트·배틀십 (가장자리 개수)', word: '눈금',
    rule: '판 바깥 숫자 = 그 가로줄/세로줄에 칠한 칸 수.',
    hint: (v) => (v === 0 ? '이 줄의 바깥 숫자만큼 이미 칠했어요. 나머지는 비어 있어야 합니다.' : '이 줄의 바깥 숫자를 채우려면 남은 칸을 모두 칠해야 해요.'),
  },

  // ── 전역 원자: 판 전체 규칙 ─────────────────────────────────────────────
  notouch: {
    id: 'notouch', role: 'global', name: '맞닿기 금지', origin: '히토리·여러 칠하기 퍼즐', word: '섬',
    rule: '칠한 칸끼리 상하좌우로 맞닿을 수 없습니다.',
    constraints(w, h) {
      const out: CardConstraint[] = [];
      for (let i = 0; i < w * h; i++) {
        const [x, y] = xy(i, w);
        if (x < w - 1) out.push({ cells: [i, i + 1], min: 0, max: 1, kind: 'notouch' });
        if (y < h - 1) out.push({ cells: [i, i + w], min: 0, max: 1, kind: 'notouch' });
      }
      return out;
    },
    hint: () => '칠한 칸 바로 옆(상하좌우)은 칠할 수 없어요.',
  },
  kingtouch: {
    id: 'kingtouch', role: 'global', name: '대각선까지 맞닿기 금지', origin: '스타배틀', word: '별',
    rule: '칠한 칸끼리 대각선을 포함해 어느 방향으로도 맞닿을 수 없습니다.',
    constraints(w, h) {
      const out: CardConstraint[] = [];
      for (let i = 0; i < w * h; i++) {
        for (const n of offsets(i, w, h, [[1, 0], [0, 1], [1, 1], [-1, 1]]))
          out.push({ cells: [i, n], min: 0, max: 1, kind: 'kingtouch' });
      }
      return out;
    },
    hint: () => '칠한 칸을 둘러싼 8칸은 칠할 수 없어요.',
  },
  kline: {
    id: 'kline', role: 'global', name: '줄마다 둘', origin: '스타배틀·N퀸', word: '쌍',
    rule: '모든 가로줄과 세로줄에 정확히 2칸씩 칠합니다.',
    constraints: (w, h) => lines(w, h).map((cells) => ({ cells, min: 2, max: 2, kind: 'kline' })),
    hint: (v) => (v === 0 ? '이 줄에는 이미 2칸이 칠해졌어요.' : '이 줄에 2칸을 채우려면 남은 칸을 칠해야 해요.'),
  },
  balanced: {
    id: 'balanced', role: 'global', name: '반반', origin: '타쿠주·빈에리', word: '저울',
    rule: '모든 가로줄과 세로줄은 칠한 칸과 빈칸이 정확히 반반입니다.',
    fits: (w, h) => w % 2 === 0 && h % 2 === 0,
    constraints: (w, h) => lines(w, h).map((cells) => ({ cells, min: cells.length / 2, max: cells.length / 2, kind: 'balanced' })),
    hint: (v) => (v === 0 ? '이 줄은 칠한 칸이 이미 절반이에요.' : '이 줄은 빈칸이 이미 절반이라 나머지는 칠해야 해요.'),
  },
  nothree: {
    id: 'nothree', role: 'global', name: '셋 연속 금지', origin: '타쿠주·빈에리', word: '물결',
    rule: '가로나 세로로 같은 상태(칠함/빈칸) 3칸이 연달아 올 수 없습니다.',
    constraints(w, h) {
      const out: CardConstraint[] = [];
      for (let i = 0; i < w * h; i++) {
        const [x, y] = xy(i, w);
        if (x < w - 2) out.push({ cells: [i, i + 1, i + 2], min: 1, max: 2, kind: 'nothree' });
        if (y < h - 2) out.push({ cells: [i, i + w, i + 2 * w], min: 1, max: 2, kind: 'nothree' });
      }
      return out;
    },
    hint: (v) => (v === 0 ? '반짝이는 칸을 칠하면 칠한 칸 3개가 가로나 세로로 연달아 놓여요.' : '반짝이는 칸이 비면 빈칸 3개가 가로나 세로로 연달아 놓여요.'),
  },
  no2x2f: {
    id: 'no2x2f', role: 'global', name: '꽉 찬 2×2 금지', origin: '누리카베', word: '틈',
    rule: '2×2 네 칸을 모두 칠할 수는 없습니다.',
    constraints(w, h) {
      const out: CardConstraint[] = [];
      for (let y = 0; y < h - 1; y++)
        for (let x = 0; x < w - 1; x++) {
          const i = y * w + x;
          out.push({ cells: [i, i + 1, i + w, i + w + 1], min: 0, max: 3, kind: 'no2x2f' });
        }
      return out;
    },
    hint: () => '이 칸을 칠하면 2×2가 꽉 차요.',
  },
  no2x2e: {
    id: 'no2x2e', role: 'global', name: '텅 빈 2×2 금지', origin: '헤야와케·누리카베 변형', word: '그물',
    rule: '2×2 네 칸이 모두 비어 있을 수는 없습니다.',
    constraints(w, h) {
      const out: CardConstraint[] = [];
      for (let y = 0; y < h - 1; y++)
        for (let x = 0; x < w - 1; x++) {
          const i = y * w + x;
          out.push({ cells: [i, i + 1, i + w, i + w + 1], min: 1, max: 4, kind: 'no2x2e' });
        }
      return out;
    },
    hint: () => '이 칸이 비면 텅 빈 2×2가 생겨요.',
  },
  conne: {
    id: 'conne', role: 'global', name: '빈칸 연결', origin: '히토리·헤야와케', word: '길',
    rule: '칠하지 않은 칸은 모두 상하좌우로 이어진 한 덩어리여야 합니다.',
    globalCheck: (s, w, h) => connectedPartial(s, w, h, 0),
    hint: () => '여기를 칠하면 빈칸들이 둘로 끊겨요.',
  },
  connf: {
    id: 'connf', role: 'global', name: '칠한 칸 연결', origin: '누리카베 (벽)', word: '벽',
    rule: '칠한 칸은 모두 상하좌우로 이어진 한 덩어리여야 합니다.',
    globalCheck: (s, w, h) => connectedPartial(s, w, h, 1),
    hint: () => '여기가 비면 칠한 칸들이 둘로 끊겨요.',
  },
};

export const CELL_ATOMS = Object.values(ATOMS).filter((a) => a.role === 'cell').map((a) => a.id);
export const EDGE_ATOMS = Object.values(ATOMS).filter((a) => a.role === 'edge').map((a) => a.id);
export const GLOBAL_ATOMS = Object.values(ATOMS).filter((a) => a.role === 'global').map((a) => a.id);
