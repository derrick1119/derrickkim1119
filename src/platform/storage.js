// 저장. localStorage 가 없거나 막힌 환경(일부 웹뷰·시크릿 모드)에서도 게임은 돌아가야 한다.
import { sanitize, defaultState } from '../core/state.js';

const KEY = 'shh-ufo:save:v1';
const BACKUP_KEY = 'shh-ufo:save:v1:backup';

export class Storage {
  constructor() {
    this.available = false;
    try {
      const probe = 'shh-ufo:probe';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      this.available = true;
    } catch {
      this.available = false;
    }
  }

  /** 저장본을 읽는다. 본 저장이 깨졌으면 백업을 쓴다. 둘 다 없으면 새 게임. */
  load() {
    if (!this.available) return { state: defaultState(), fresh: true };
    for (const key of [KEY, BACKUP_KEY]) {
      try {
        const text = window.localStorage.getItem(key);
        if (!text) continue;
        const raw = JSON.parse(text);
        if (raw && typeof raw === 'object' && typeof raw.v === 'number') return { state: sanitize(raw), fresh: false };
      } catch {
        /* 다음 후보로 */
      }
    }
    return { state: defaultState(), fresh: true };
  }

  /** @returns {boolean} 저장에 성공했는지 */
  save(state) {
    if (!this.available) return false;
    try {
      const text = JSON.stringify(state);
      const prev = window.localStorage.getItem(KEY);
      window.localStorage.setItem(KEY, text);
      // 직전 저장본을 백업으로 한 벌 더 둔다(저장 도중 앱이 죽는 경우 대비).
      if (prev && prev !== text) window.localStorage.setItem(BACKUP_KEY, prev);
      return true;
    } catch {
      return false;
    }
  }

  clear() {
    if (!this.available) return;
    try {
      window.localStorage.removeItem(KEY);
      window.localStorage.removeItem(BACKUP_KEY);
    } catch {
      /* 무시 */
    }
  }
}

/** 기기 현지 날짜 'YYYY-MM-DD'. 출석 보급품의 기준. */
export function localDay(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
