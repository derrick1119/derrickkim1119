/**
 * 저장 (D005, GDD §10 뼈대 → D007 판 id 기준): 판 id('1-3')별 최고 별. 키 `duckbath.v1` 하나의 JSON.
 * localStorage가 막힌 환경(사파리 개인 정보 모드·임베드)에서는 메모리에만 두고 게임은 그대로 돈다.
 * D007 (CONTENT v0.3 §5): 판이 월드 순서로 다시 놓여 옛 번호 저장(ver 1)은 OLD_IDS로 옮긴다.
 */
export interface SaveData {
  ver: 2;
  /** 판 id → 최고 별 0~3 (깬 적 없으면 키가 없다) */
  best: Record<string, number>;
}

export const SAVE_KEY = 'duckbath.v1';
/** ver 1의 판 번호 i가 가리키던 판 id (D006까지의 놀이 순서) */
export const OLD_IDS = ['1-1', '1-2', '1-3', '2-1', '2-4', '3-2', '3-4', '2-9'];

export interface Store {
  data: SaveData;
  /** 진짜로 저장되는가 (false면 메모리뿐 — 판 고르기 화면에 작게 알린다) */
  persistent: boolean;
  /** 놀이 순서로 몇 판이 열렸나 (1 = 첫 판만). 깬 판 중 가장 뒤 판의 다음 판까지 */
  readonly open: number;
  /** 판 id의 최고 별 (없으면 0) */
  stars(id: string): number;
  /** 판을 깼다: 최고 별 갱신 → 저장 */
  clear(id: string, stars: number): void;
}

const clamp = (v: unknown) => Math.max(0, Math.min(3, Math.floor(Number(v) || 0)));

/** 깨진·옛 데이터는 초기화 대신 살릴 수 있는 것만 살린다. 모르는 id는 버린다 */
export function parse(raw: string | null, ids: readonly string[]): SaveData {
  const d: SaveData = { ver: 2, best: {} };
  if (!raw) return d;
  try {
    const j = JSON.parse(raw);
    const put = (id: string | undefined, v: unknown) => {
      const n = clamp(v);
      if (id && ids.includes(id) && n > 0) d.best[id] = Math.max(d.best[id] ?? 0, n);
    };
    if (j?.ver === 2 && j.best && typeof j.best === 'object' && !Array.isArray(j.best)) for (const [id, v] of Object.entries(j.best)) put(id, v);
    else if (Array.isArray(j?.best)) j.best.forEach((v: unknown, i: number) => put(OLD_IDS[i], v)); // ver 1: 번호 → id
  } catch { /* 깨진 JSON — 새로 시작 */ }
  return d;
}

/** ids = 놀이 순서의 판 id. getStorage는 테스트에서 가짜를 넣으려고 함수로 받는다. 접근 자체가 예외를 던질 수도 있다 */
export function makeStore(ids: readonly string[], getStorage: () => Storage | undefined = () => globalThis.localStorage): Store {
  let ls: Storage | undefined;
  let persistent = false;
  try {
    ls = getStorage();
    if (ls) {
      ls.setItem(SAVE_KEY + ':probe', '1');
      ls.removeItem(SAVE_KEY + ':probe');
      persistent = true;
    }
  } catch {
    ls = undefined;
  }
  let raw: string | null = null;
  try {
    raw = persistent && ls ? ls.getItem(SAVE_KEY) : null;
  } catch { /* 읽기 실패 — 새로 */ }
  const data = parse(raw, ids);
  const write = () => {
    if (!persistent || !ls) return;
    try {
      ls.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      persistent = false; // 용량·권한 — 이후로는 메모리만
    }
  };
  if (raw && JSON.stringify(data) !== raw) write(); // 옛 판·깨진 데이터를 새 모양으로 한 번 고쳐 쓴다
  return {
    data,
    get persistent() {
      return persistent;
    },
    get open() {
      let last = -1;
      ids.forEach((id, i) => (data.best[id] ? (last = i) : 0));
      return Math.min(ids.length, last + 2);
    },
    stars: (id) => data.best[id] ?? 0,
    clear(id, stars) {
      if (!ids.includes(id)) return;
      data.best[id] = Math.max(data.best[id] ?? 0, clamp(stars));
      write();
    },
  };
}
