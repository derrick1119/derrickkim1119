/**
 * 저장 (D005, GDD §10 뼈대): 판별 최고 별과 열린 판. 키 `duckbath.v1` 하나의 JSON.
 * localStorage가 막힌 환경(사파리 개인 정보 모드·임베드)에서는 메모리에만 두고 게임은 그대로 돈다.
 */
export interface SaveData {
  ver: 1;
  /** 판별 최고 별 0~3 */
  best: number[];
  /** 열린 판 수(1 = 1판만). 판을 깨면 다음 판이 열린다 */
  open: number;
}

export const SAVE_KEY = 'duckbath.v1';

export interface Store {
  data: SaveData;
  /** 진짜로 저장되는가 (false면 메모리뿐 — 판 선택 화면에 작게 알린다) */
  persistent: boolean;
  /** 판을 깼다: 최고 별 갱신 + 다음 판 열기 → 저장 */
  clear(stage: number, stars: number): void;
}

const fresh = (n: number): SaveData => ({ ver: 1, best: Array.from({ length: n }, () => 0), open: 1 });

/** 깨진·옛 데이터는 초기화 대신 살릴 수 있는 것만 살린다 */
function parse(raw: string | null, n: number): SaveData {
  const d = fresh(n);
  if (!raw) return d;
  try {
    const j = JSON.parse(raw);
    if (Array.isArray(j?.best)) for (let i = 0; i < n; i++) d.best[i] = Math.max(0, Math.min(3, Math.floor(Number(j.best[i]) || 0)));
    d.open = Math.max(1, Math.min(n, Math.floor(Number(j?.open) || 1)));
    // 별이 있는 판의 다음 판은 열려 있어야 한다
    for (let i = 0; i < n; i++) if (d.best[i] > 0) d.open = Math.max(d.open, Math.min(n, i + 2));
  } catch { /* 깨진 JSON — 새로 시작 */ }
  return d;
}

/** getStorage는 테스트에서 가짜를 넣으려고 함수로 받는다. 접근 자체가 예외를 던질 수도 있다 */
export function makeStore(n: number, getStorage: () => Storage | undefined = () => globalThis.localStorage): Store {
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
  const data = parse(raw, n);
  const write = () => {
    if (!persistent || !ls) return;
    try {
      ls.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      persistent = false; // 용량·권한 — 이후로는 메모리만
    }
  };
  return {
    data,
    get persistent() {
      return persistent;
    },
    clear(stage, stars) {
      data.best[stage] = Math.max(data.best[stage] ?? 0, stars);
      data.open = Math.max(data.open, Math.min(n, stage + 2));
      write();
    },
  };
}
