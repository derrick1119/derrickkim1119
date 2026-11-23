// progression 기능들이 함께 쓰는 작은 도우미(규칙 전용: DOM·three.js 없음).
import { CAUSE_BY_ID } from '../../data/content.js';

/** 사건 종류. 모르는 사건이면 null. */
export const kindOf = (causeId) => (typeof causeId === 'string' && CAUSE_BY_ID[causeId]?.kind) || null;

/** 임무가 아닌 사건 종류(발각 보정은 이 종류에만 'detect' 로 건다. 임무는 'missionRisk' 로 건다). */
export const NON_MISSION = ['specimen', 'gaze', 'special'];

/**
 * 효과 하나를 능력치에 적용한다.
 * @param {{key: string, mul?: number, add?: number, kinds?: string[]}} e
 */
export function applyEffect(e, key, value, ctx) {
  if (e.key !== key) return value;
  if (e.kinds) {
    const kind = kindOf(ctx?.cause);
    if (!kind || !e.kinds.includes(kind)) return value;
  }
  let v = value;
  if (typeof e.mul === 'number') v *= e.mul;
  if (typeof e.add === 'number') v += e.add;
  return v;
}

/** 기능 슬롯을 꺼낸다. 없거나 깨졌으면 새로 만들어 끼운다(테스트처럼 손으로 만든 상태 대비). */
export function slotOf(game, id, make) {
  const s = game.state;
  if (!s.ext || typeof s.ext !== 'object') s.ext = {};
  let slot = s.ext[id];
  if (!slot || typeof slot !== 'object' || Array.isArray(slot)) {
    slot = make();
    s.ext[id] = slot;
  }
  return slot;
}

/** 가중치 뽑기(rng 하나만 쓴다). 빈 목록이면 null. */
export function pickWeighted(rng, items, weightOf) {
  let total = 0;
  for (const it of items) total += Math.max(0, weightOf(it));
  if (!(total > 0)) return items.length ? items[Math.min(items.length - 1, Math.floor(rng() * items.length))] : null;
  let r = rng() * total;
  for (const it of items) {
    r -= Math.max(0, weightOf(it));
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}
