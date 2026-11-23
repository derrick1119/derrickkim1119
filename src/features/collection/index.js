// 기능 묶음: collection (core 규칙 — DOM·three.js 를 쓰지 않는다)
//   반짝이 도감 · 관측실 진열 선반 · 셀카 앨범의 저장 슬롯(state.ext.collection)과 규칙.
//   API: game.fx.collection (아래 install 참고)
//   이벤트(game.emit): 'shinyFound' {id, count, first, reward}, 'albumGoal' {id, reward}, 'roomChange'
import './strings.js';
import { defineFeature } from '../../core/features.js';
import { CAUSE_BY_ID, SPECIMEN_BY_ID } from '../../data/content.js';
import {
  initialSlot,
  sanitizeSlot,
  recordShiny,
  shinyReward,
  slotCost,
  canPlace,
  place,
  addSlot,
  roomBonuses,
  applyTotal,
  recordPhoto,
  photobombChance,
} from './rules.js';

export * from './rules.js';

const ID = 'collection';

/** 슬롯이 없거나 다른 기능이 망가뜨렸으면 새로 깐다. 저장본이 바뀌어도 항상 지금 것을 읽는다. */
function slotOf(game) {
  const ext = game.state.ext || (game.state.ext = {});
  let s = ext[ID];
  if (!s || typeof s !== 'object' || !Array.isArray(s.shelf) || !s.dex || !s.album) {
    s = sanitizeSlot(s);
    ext[ID] = s;
  }
  return s;
}

const collectedFn = (game) => (kind) => (game.state.stats?.bySpecimen?.[kind] || 0) > 0;

// 보정은 자주 불린다(매 프레임 시선 폭 등). 슬롯이 바뀌지 않았으면 계산을 다시 쓴다.
const cache = new WeakMap(); // game → { slot, ver, kinds, data }
let version = 0;
function bonusesOf(game) {
  const slot = slotOf(game);
  const kinds = Object.keys(game.state.stats?.bySpecimen || {}).length;
  const c = cache.get(game);
  if (c && c.slot === slot && c.ver === version && c.kinds === kinds) return c.data;
  const data = roomBonuses(slot, collectedFn(game));
  cache.set(game, { slot, ver: version, kinds, data });
  return data;
}
const touch = () => {
  version++;
};

export default defineFeature({
  id: ID,
  initial: initialSlot,
  sanitize: (raw) => sanitizeSlot(raw),

  install(game) {
    const api = {
      // ───── 반짝이 도감 ─────
      /** 종류별 반짝이 기록. { kind: {n, gen} } */
      dex: () => slotOf(game).dex,
      shinyCount: (kind) => slotOf(game).dex[kind]?.n || 0,
      shinyTotal: () => Object.values(slotOf(game).dex).reduce((a, e) => a + e.n, 0),
      /** 반짝이 하나를 도감에 넣는다. 그 종류의 첫 반짝이면 연구비를 준다. */
      recordShiny(kind) {
        if (!SPECIMEN_BY_ID[kind]) return null;
        const slot = slotOf(game);
        const { count, first } = recordShiny(slot, kind, game.state.gen);
        let reward = 0;
        if (first) {
          reward = game.grantFor(shinyReward(kind), 'shiny');
          game.state.grant += reward;
        }
        touch();
        const out = { id: kind, count, first, reward };
        game.emit('shinyFound', out);
        game.emit('change');
        return out;
      },

      // ───── 관측실 ─────
      slots: () => slotOf(game).slots,
      shelf: () => slotOf(game).shelf,
      /** 다음 자리 값(다 열었으면 null). */
      nextSlotCost: () => slotCost(slotOf(game).slots),
      buySlot() {
        const slot = slotOf(game);
        const cost = slotCost(slot.slots);
        if (cost === null || game.state.grant < cost) return false;
        game.state.grant -= cost;
        addSlot(slot);
        touch();
        game.emit('roomChange');
        game.emit('change');
        return true;
      },
      isCollected: (kind) => collectedFn(game)(kind),
      canDisplay: (index, kind, shiny = false) => canPlace(slotOf(game), index, kind, shiny, collectedFn(game)(kind)),
      display(index, kind, shiny = false) {
        const ok = place(slotOf(game), index, kind, shiny, collectedFn(game)(kind));
        if (ok) {
          touch();
          game.emit('roomChange');
          game.emit('change');
        }
        return ok;
      },
      clearSlot(index) {
        const slot = slotOf(game);
        if (!Number.isInteger(index) || index < 0 || index >= slot.slots || !slot.shelf[index]) return false;
        slot.shelf[index] = null;
        touch();
        game.emit('roomChange');
        game.emit('change');
        return true;
      },
      /** 진열 효과: { items, sets, totals } (rules.roomBonuses) */
      bonuses: () => bonusesOf(game),

      // ───── 셀카 앨범 ─────
      album: () => slotOf(game).album,
      /** 지금 사진을 찍으면 지구인에게 찍힐 확률. */
      photoRisk({ watching = 0, cloaked = game.cloaked } = {}) {
        const c = CAUSE_BY_ID.photobomb;
        if (!c) return 0;
        // 같은 사건으로 들킬수록(저항)·발각 보정이 붙을수록 줄어든다
        const rel = c.base > 0 ? game.chance('photobomb') / c.base : 1;
        return photobombChance({ watching, cloaked, rel });
      },
      /** 찍힐지 굴린다(난수는 게임 것). */
      rollPhotobomb(o) {
        const p = api.photoRisk(o);
        return p > 0 && game.rng() < p;
      },
      /** 사진 한 장을 기록하고, 이룬 앨범 업적의 연구비를 준다. */
      recordPhoto(stageId) {
        const res = recordPhoto(slotOf(game), stageId);
        const goals = res.goals.map((g) => {
          const reward = game.grantFor(g.reward, 'album');
          game.state.grant += reward;
          return { id: g.id, reward };
        });
        for (const g of goals) game.emit('albumGoal', g);
        game.emit('change');
        return { newStage: res.newStage, goals };
      },
    };

    game.on('collected', (e) => {
      if (e && e.shiny === true) api.recordShiny(e.id);
    });
    game.on('replaced', touch);
    return api;
  },

  modify(key, value, ctx, game) {
    const total = bonusesOf(game).totals[key];
    return total ? applyTotal(total, value) : value;
  },
});
