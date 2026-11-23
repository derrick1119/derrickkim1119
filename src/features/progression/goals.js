// 이번 대원의 목표. 대원이 올 때마다 해금한 표본·임무·형태에 맞춰 세 가지를 낸다.
// 다 채우면 연구비(grantFor(..., 'goal')). 대원이 바뀌면 새 목표가 온다. 진행은 저장된다.
import { defineFeature, clean } from '../../core/features.js';
import { FORMS, SPECIMEN_BY_ID } from '../../data/content.js';
import { reportGrant } from '../../core/balance.js';
import { slotOf, pickWeighted } from './shared.js';

/** 목표를 채웠다고 보는 임무 점수. */
export const MISSION_SCORE = 0.8;
/** 목표 보상 = 보고서 연구비(보통) × 이 값 × 난이도. */
export const REWARD_SCALE = 0.18;
export const GOAL_TYPES = ['collect', 'total', 'combo', 'nearMiss', 'cloak', 'mission', 'formUp', 'shiny'];

const initial = () => ({ gen: 0, list: [], done: 0, perfect: 0 });

const clampInt = (v, a, b) => Math.max(a, Math.min(b, Math.round(v)));

/**
 * 목표 후보. make(game) → {param?, target, diff} 또는 null(지금은 낼 수 없음).
 * group: 같은 묶음끼리는 한 대원에게 하나만 낸다(표본 n개 + 아무 표본 n개 같은 겹침 방지).
 */
const MAKERS = {
  collect: {
    weight: 3,
    group: 'collect',
    make(game, rng) {
      const table = game.spawnTable();
      if (!table.length) return null;
      const total = table.reduce((a, e) => a + e.weight, 0) || 1;
      // 최근에 해금한(자주 나오는) 표본 쪽으로 기운다
      const e = pickWeighted(rng, table, (x) => x.weight);
      const share = e.weight / total;
      const target = clampInt(share * 12, 3, 8);
      return { param: e.spec.id, target, diff: target >= 6 ? 2 : 1 };
    },
  },
  total: {
    weight: 2,
    group: 'collect',
    make(game, rng) {
      const target = clampInt(10 + 2 * game.formIndex + rng() * 4, 10, 26);
      return { target, diff: target >= 18 ? 2 : 1 };
    },
  },
  combo: {
    weight: 2,
    make(game) {
      return { target: clampInt(6 + game.formIndex, 6, 14), diff: 2 };
    },
  },
  nearMiss: {
    weight: 1.5,
    make(game) {
      const target = game.formIndex >= 3 ? 2 : 1;
      return { target, diff: target };
    },
  },
  cloak: {
    weight: 1,
    make(game) {
      // 은폐를 처음 알려 주는 것은 두 번째 대원부터
      if (game.state.gen < 2 && !game.state.stats.cloaks) return null;
      return { target: 1, diff: 1 };
    },
  },
  mission: {
    weight: 1.5,
    make(game) {
      if (!Object.keys(game.state.unlocked.missions).length) return null;
      return { target: 1, diff: 3 };
    },
  },
  formUp: {
    weight: 1.5,
    make(game) {
      const next = game.formIndex + 1;
      if (next >= FORMS.length) return null;
      return { param: String(next), target: 1, diff: 3 };
    },
  },
  shiny: {
    weight: 1,
    make(game) {
      // 반짝이를 한 번이라도 본 뒤에만(어떤 것인지 알아야 노릴 수 있다)
      if (!(game.state.stats.shinies > 0)) return null;
      return { target: 1, diff: 2 };
    },
  },
};

/** 목표 하나의 보상(보정 전 연구비). */
export function goalReward(game, diff) {
  const base = reportGrant({ formIndex: game.formIndex, progress: 0.5, isNew: false, aiLevel: game.state.gadgets.ai || 0 });
  return Math.max(2, Math.round(base * REWARD_SCALE * diff));
}

/** 이번 대원의 목표 세 개를 만든다. */
export function makeGoals(game, count = 3) {
  const rng = game.rng;
  const out = [];
  const usedGroups = new Set();
  const candidates = Object.entries(MAKERS);
  for (let i = 0; i < count; i++) {
    const pool = candidates.filter(([type, m]) => !out.some((g) => g.type === type) && !(m.group && usedGroups.has(m.group)));
    if (!pool.length) break;
    const [type, maker] = pickWeighted(rng, pool, ([, m]) => m.weight);
    const g = maker.make(game, rng);
    if (!g) {
      // 낼 수 없는 목표는 후보에서 빼고 다시 뽑는다
      candidates.splice(candidates.findIndex(([t]) => t === type), 1);
      i--;
      continue;
    }
    if (maker.group) usedGroups.add(maker.group);
    out.push({ type, param: g.param ?? null, target: g.target, n: 0, done: false, reward: goalReward(game, g.diff) });
  }
  return out;
}

function regenerate(game) {
  const slot = slotOf(game, 'goals', initial);
  slot.gen = game.state.gen;
  slot.list = makeGoals(game);
}

defineFeature({
  id: 'goals',
  initial,
  sanitize(raw, init) {
    const r = clean.obj(raw);
    const list = clean.arr(
      r.list,
      (g0) => {
        const g = clean.obj(g0);
        if (!GOAL_TYPES.includes(g.type)) return undefined;
        let param = null;
        if (g.type === 'collect') {
          if (typeof g.param !== 'string' || !SPECIMEN_BY_ID[g.param]) return undefined;
          param = g.param;
        } else if (g.type === 'formUp') {
          const f = clean.int(Number(g.param), -1, -1, FORMS.length - 1);
          if (f < 1) return undefined;
          param = String(f);
        }
        const target = clean.int(g.target, 1, 1, 999);
        return {
          type: g.type,
          param,
          target,
          n: clean.int(g.n, 0, 0, target),
          done: clean.bool(g.done, false),
          reward: clean.int(g.reward, 1, 0, 1e9),
        };
      },
      3,
    );
    return {
      gen: clean.int(r.gen, init.gen, 0),
      list,
      done: clean.int(r.done, 0, 0),
      perfect: clean.int(r.perfect, 0, 0),
    };
  },
  install(game) {
    const slot = () => slotOf(game, 'goals', initial);
    const ensure = () => {
      const s = slot();
      if (s.gen !== game.state.gen || !s.list.length) regenerate(game);
    };
    ensure();

    /** 진행을 n 으로(또는 +by) 바꾸고, 채웠으면 보상한다. */
    const bump = (type, { by = 1, to = null, param = null } = {}) => {
      const s = game.state.ext?.goals;
      if (!s || s.gen !== game.state.gen) return;
      let changed = false;
      s.list.forEach((g, index) => {
        if (g.done || g.type !== type) return;
        if (g.param !== null && param !== null && g.param !== param) return;
        if (g.type === 'collect' && g.param !== param) return;
        const before = g.n;
        g.n = Math.min(g.target, to !== null ? Math.max(g.n, to) : g.n + by);
        if (g.n === before) return;
        changed = true;
        if (g.n >= g.target) {
          g.done = true;
          s.done++;
          const grant = game.grantFor(g.reward, 'goal');
          game.state.grant += grant;
          const all = s.list.every((x) => x.done);
          if (all) s.perfect++;
          game.emit('progression:goal', { index, goal: { ...g }, grant, all });
        }
      });
      if (changed) {
        game.emit('progression:goalProgress', { type });
        game.emit('change');
      }
    };

    game.on('collected', (e) => {
      if (!e.auto) {
        bump('collect', { param: e.id });
        bump('total');
        bump('combo', { to: e.combo || 0, by: 0 });
      }
      if (e.shiny) bump('shiny');
    });
    game.on('nearMiss', (e) => {
      bump('nearMiss');
      bump('combo', { to: e.combo || 0, by: 0 });
    });
    game.on('missionOk', (e) => {
      if ((e.score ?? 0) >= MISSION_SCORE - 1e-9) bump('mission');
    });
    game.on('formUp', (e) => {
      const s = game.state.ext?.goals;
      if (!s) return;
      if (s.list.some((g) => g.type === 'formUp' && !g.done && e.form >= Number(g.param))) bump('formUp');
    });
    game.on('cloak', (e) => {
      if (e.on) bump('cloak');
    });
    game.on('generation', () => regenerate(game));
    game.on('replaced', ensure);

    return {
      /** 이번 대원의 목표 [{type, param, target, n, done, reward}] */
      list: () => (game.state.ext?.goals?.gen === game.state.gen ? game.state.ext.goals.list : []),
      doneCount: () => (game.state.ext?.goals?.list || []).filter((g) => g.done).length,
      totals: () => ({ done: game.state.ext?.goals?.done || 0, perfect: game.state.ext?.goals?.perfect || 0 }),
      MISSION_SCORE,
    };
  },
});
