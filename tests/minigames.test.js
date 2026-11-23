import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clamp01,
  gradeFor,
  effectOf,
  effectPercents,
  circlePath,
  traceAccuracy,
  resample,
  pathLength,
  redlightSchedule,
  redlightPhase,
  redlightSafeTime,
  redlightSpeed,
  redlightState,
  redlightStep,
  redlightScore,
  sdCircle,
  sdPolygon,
  coverOf,
  makeZonePath,
  shadowScore,
  holdState,
  holdStep,
  holdBand,
  bandCover,
  holdScore,
  laneWaves,
  lanesScore,
  judgeOffset,
  WINDOWS,
  rhythmChart,
  rhythmState,
  rhythmTap,
  rhythmExpire,
  rhythmScore,
  seededRng,
} from '../src/ui/minigames/score.js';
import { MISSION_GAMES, TEMPLATES, tuneFor, missionLevel } from '../src/ui/minigames/config.js';
import { MISSIONS } from '../src/data/content.js';

const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const avg = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;

// ───────── 공통 ─────────

test('점수 자르기와 등급', () => {
  assert.equal(clamp01(-1), 0);
  assert.equal(clamp01(2), 1);
  assert.equal(clamp01(NaN), 0);
  assert.equal(clamp01(0.4), 0.4);
  assert.equal(gradeFor(1), 'perfect');
  assert.equal(gradeFor(0.9), 'perfect');
  assert.equal(gradeFor(0.7), 'good');
  assert.equal(gradeFor(0.5), 'close');
  assert.equal(gradeFor(0.1), 'bad');
  assert.equal(gradeFor(NaN), 'bad');
});

test('결과 배율은 0.5점에서 모두 1배이고, 점수가 높을수록 덜 들키고 더 자란다', () => {
  const mid = effectOf(0.5);
  assert.ok(near(mid.risk, 1) && near(mid.gain, 1) && near(mid.grant, 1));
  assert.ok(effectOf(1).risk < 1 && effectOf(1).gain > 1);
  assert.ok(effectOf(0).risk > 1 && effectOf(0).gain < 1);
  assert.deepEqual(effectPercents(0.5), { risk: 0, gain: 0, grant: 0 });
  assert.deepEqual(effectPercents(1), { risk: -35, gain: 30, grant: 25 });
});

test('모든 임무에 미니게임이 있고, 여섯 틀을 모두 쓴다', () => {
  for (const m of MISSIONS) {
    assert.ok(TEMPLATES.includes(MISSION_GAMES[m.id]), m.id);
    const tune = tuneFor(m.id);
    assert.equal(tune.tpl, MISSION_GAMES[m.id]);
    assert.ok(tune.duration >= 6 && tune.duration <= 8.5, `${m.id} 길이 ${tune.duration}`);
  }
  assert.deepEqual([...new Set(Object.values(MISSION_GAMES))].sort(), [...TEMPLATES].sort());
  assert.equal(missionLevel('crop'), 0);
  assert.equal(missionLevel('moon'), 1);
  assert.equal(tuneFor('없는임무').tpl, 'hold', '모르는 임무도 놀 수 있다');
});

// ───────── 따라 그리기 ─────────

const target = [circlePath(0, 0, 1, 96)];
/** 원을 따라 그린다. wobble = 반지름 흔들림, turns = 몇 바퀴, jitter = 점마다 흔들림 */
function traceCircle({ r = 1, wobble = 0, turns = 1, from = 0, cx = 0, cy = 0, n = 80, jitter = 0, rng = seededRng(3) } = {}) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + from + (i / n) * Math.PI * 2 * turns;
    const rr = r + wobble * Math.sin(a * 3) + jitter * (rng() * 2 - 1);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return pts;
}

test('원 따라 그리기: 완벽하면 1점, 아무것도 안 그리면 0점', () => {
  const perfect = traceAccuracy([traceCircle()], target);
  assert.ok(perfect.score > 0.99, `완벽 ${perfect.score}`);
  assert.ok(perfect.coverage > 0.99);
  assert.equal(traceAccuracy([], target).score, 0);
  assert.equal(traceAccuracy([[]], target).score, 0);
});

test('원 따라 그리기: 대충 그리면 중간, 반만 그리거나 엉뚱하게 그리면 낮다', () => {
  const skilled = traceAccuracy([traceCircle({ wobble: 0.03, jitter: 0.02 })], target).score;
  const average = traceAccuracy([traceCircle({ wobble: 0.12, jitter: 0.06, turns: 0.9 })], target).score;
  const sloppy = traceAccuracy([traceCircle({ r: 0.82, wobble: 0.15, jitter: 0.08, turns: 0.85 })], target).score;
  const half = traceAccuracy([traceCircle({ turns: 0.5 })], target).score;
  const elsewhere = traceAccuracy([traceCircle({ cx: 3, cy: 3 })], target).score;
  assert.ok(skilled >= 0.9, `숙련 ${skilled}`);
  assert.ok(average >= 0.5 && average <= 0.8, `보통 ${average}`);
  assert.ok(sloppy < average && sloppy < 0.5, `엉성 ${sloppy}`);
  assert.ok(half > 0.3 && half < 0.6, `반 바퀴 ${half}`);
  assert.equal(elsewhere, 0);
});

test('원 따라 그리기: 마구 문지르면 점수가 낮다', () => {
  const rng = seededRng(9);
  const scribble = [];
  for (let i = 0; i < 300; i++) scribble.push([rng() * 2.4 - 1.2, rng() * 2.4 - 1.2]);
  const s = traceAccuracy([scribble], target).score;
  assert.ok(s < 0.2, `문지르기 ${s}`);
  const twice = traceAccuracy([traceCircle({ turns: 2, n: 160 })], target).score;
  assert.ok(twice > 0.85 && twice < 0.95, `두 바퀴는 조금 깎인다 ${twice}`);
});

test('원 따라 그리기: 크기·위치·방향·시작점·끊어 그리기와 상관없이 같은 기준', () => {
  const big = [circlePath(200, 300, 120, 96)];
  const a = traceAccuracy([traceCircle({ wobble: 0.05 })], target).score;
  const b = traceAccuracy([traceCircle({ wobble: 0.05 }).map(([x, y]) => [200 + x * 120, 300 + y * 120])], big, { unit: 120 }).score;
  assert.ok(near(a, b, 0.02), `${a} vs ${b}`);
  const ccw = traceCircle().reverse();
  assert.ok(traceAccuracy([ccw], target).score > 0.99, '반대 방향');
  const full = traceCircle({ from: 1.3 });
  assert.ok(traceAccuracy([full], target).score > 0.99, '다른 시작점');
  const split = [full.slice(0, 40), full.slice(41)];
  assert.ok(traceAccuracy(split, target).score > 0.95, '두 번에 나눠 그리기');
});

test('다시 찍기: 같은 간격, 길이 보존', () => {
  const line = [
    [0, 0],
    [10, 0],
    [10, 10],
  ];
  const pts = resample(line, 1);
  assert.equal(pts.length, 21);
  for (let i = 1; i < pts.length; i++) assert.ok(near(Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]), 1, 1e-6));
  assert.equal(pathLength(line), 20);
});

// ───────── 얼음 땡 ─────────

const RL = (id, seed) => {
  const tune = tuneFor(id);
  const sched = redlightSchedule(seededRng(seed), tune);
  return { tune: { ...tune, speed: redlightSpeed(sched, tune.duration, tune.margin) }, sched };
};

test('얼음 땡: 일정은 빈틈없이 이어지고 단계가 차례로 바뀐다', () => {
  const { sched, tune } = RL('cvs', 1);
  for (let i = 1; i < sched.length; i++) assert.ok(near(sched[i].start, sched[i - 1].end));
  assert.ok(sched[sched.length - 1].end >= tune.duration);
  const c = sched[0];
  assert.ok(c.tell - c.start >= tune.firstAway[0], '첫 주기는 넉넉히 딴 데를 본다');
  assert.equal(redlightPhase(sched, c.start + 0.01).phase, 'away');
  assert.equal(redlightPhase(sched, c.tell + 0.01).phase, 'tell');
  assert.equal(redlightPhase(sched, c.look + 0.01).phase, c.feint ? 'away' : 'look');
  assert.ok(redlightSafeTime(sched, tune.duration) < tune.duration);
});

/** 정책에 따라 놀아 본다. policy(phase, state) → 누르고 있는지 */
function playRedlight(id, seed, policy) {
  const { tune, sched } = RL(id, seed);
  const st = redlightState();
  const dt = 1 / 60;
  let ev;
  while (st.t < tune.duration && ev !== 'goal') ev = redlightStep(st, dt, policy(redlightPhase(sched, st.t), st, tune), sched, tune);
  return { score: redlightScore(st), st };
}

test('얼음 땡: 잘하면 1점, 계속 누르면 크게 깎이고, 보통은 중간', () => {
  for (const id of ['cvs', 'telescope']) {
    const skilled = [];
    const average = [];
    const greedy = [];
    const idle = [];
    for (let seed = 1; seed <= 30; seed++) {
      // 숙련: 예고가 거의 끝날 때까지 가다가 멈추고, 돌아서자마자 다시 간다
      skilled.push(playRedlight(id, seed, (p) => p.phase === 'away' || (p.phase === 'tell' && p.left > 0.12)).score);
      // 보통: 예고를 보고 0.3초 뒤에 떼고, 돌아서고 0.4초 뒤에 다시 누른다. 세 번에 한 번은 늦게 떼서 들킨다.
      const rng = seededRng(seed * 7);
      let late = false;
      let cycle = -1;
      average.push(
        playRedlight(id, seed, (p) => {
          if (p.cycle !== cycle) {
            cycle = p.cycle;
            late = rng() < 0.33;
          }
          if (p.phase === 'away') return p.cycle === 0 ? p.since > 0.3 : p.since > 0.4;
          if (p.phase === 'tell') return late || p.since < 0.3;
          return late && p.since < 0.25;
        }).score,
      );
      greedy.push(playRedlight(id, seed, () => true).score);
      idle.push(playRedlight(id, seed, () => false).score);
    }
    assert.ok(avg(skilled) >= 0.92, `${id} 숙련 ${avg(skilled)}`);
    assert.ok(avg(average) >= 0.45 && avg(average) <= 0.8, `${id} 보통 ${avg(average)}`);
    assert.ok(avg(greedy) < 0.45, `${id} 막무가내 ${avg(greedy)}`);
    assert.equal(avg(idle), 0, `${id} 가만히`);
  }
});

test('얼음 땡: 들키면 뒤로 밀리고 잠깐 못 움직인다', () => {
  const sched = [{ start: 0, tell: 0, look: 0, end: 10, feint: false }];
  const tune = { speed: 0.5, grace: 0.1, pushback: 0.1, stun: 0.5, invuln: 1, margin: 1 };
  const st = redlightState();
  st.progress = 0.5;
  let ev = null;
  for (let i = 0; i < 12 && !ev; i++) ev = redlightStep(st, 0.01, true, sched, tune);
  assert.equal(ev, 'caught');
  assert.equal(st.catches, 1);
  assert.ok(st.progress < 0.5 && st.progress > 0.39);
  const p = st.progress;
  redlightStep(st, 0.1, true, sched, tune);
  assert.equal(st.progress, p, '얼어붙은 동안은 못 간다');
  assert.equal(redlightScore({ progress: 1, catches: 0 }), 1);
  assert.ok(near(redlightScore({ progress: 1, catches: 1 }), 0.78));
  assert.equal(redlightScore({ progress: 1, catches: 9 }), 0);
});

// ───────── 그림자 숨기 ─────────

test('부호 있는 거리: 원과 다각형', () => {
  assert.equal(sdCircle(0, 0, 0, 0, 1), -1);
  assert.equal(sdCircle(2, 0, 0, 0, 1), 1);
  const sq = [
    [0, 0],
    [2, 0],
    [2, 2],
    [0, 2],
  ];
  assert.equal(sdPolygon(1, 1, sq), -1);
  assert.equal(sdPolygon(3, 1, sq), 1);
  assert.ok(near(sdPolygon(3, 3, sq), Math.SQRT2));
  const tri = [
    [0, 0],
    [4, 0],
    [0, 4],
  ];
  assert.ok(sdPolygon(1, 1, tri) < 0);
  assert.ok(sdPolygon(3, 3, tri) > 0);
  assert.equal(coverOf(-0.5, 0.1), 1);
  assert.equal(coverOf(0.05, 0.1), 0.5);
  assert.equal(coverOf(0.2, 0.1), 0);
});

/** 구역을 lag 초 늦게 쫓아간다(손가락이 늦게 따라가는 사람). */
function playShadow(id, seed, lag, gain = 7) {
  const tune = tuneFor(id);
  const path = makeZonePath(seededRng(seed), tune);
  const dt = 1 / 60;
  let p = path(0);
  let inside = 0;
  for (let t = 0; t < tune.duration; t += dt) {
    const goal = path(Math.max(0, t - lag));
    p = { x: p.x + (goal.x - p.x) * Math.min(1, gain * dt), y: p.y + (goal.y - p.y) * Math.min(1, gain * dt) };
    const z = path(t);
    inside += coverOf(sdCircle(p.x, p.y, z.x, z.y, tune.radius), tune.soft) * dt;
  }
  return shadowScore(inside / tune.duration);
}

test('그림자 숨기: 잘 따라가면 만점, 늦게 따라가면 중간, 가만히 있으면 낮다', () => {
  for (const id of ['cloudnap', 'pyramid', 'moon']) {
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
    const skilled = avg(seeds.map((s) => playShadow(id, s, 0.12, 12)));
    // 보통: 0.4~0.55초 늦게, 느슨하게 따라간다
    const average = avg(seeds.map((s) => (playShadow(id, s, 0.4, 5) + playShadow(id, s, 0.55, 4)) / 2));
    const idle = avg(seeds.map((s) => playShadow(id, s, 0, 0)));
    assert.ok(skilled >= 0.9, `${id} 숙련 ${skilled}`);
    assert.ok(average >= 0.4 && average <= 0.85, `${id} 보통 ${average}`);
    assert.ok(idle < average, `${id} 가만히 ${idle}`);
  }
  assert.equal(shadowScore(1), 1);
  assert.equal(shadowScore(0.2), 0);
});

test('그림자 숨기: 구역 길은 화면 안에 머문다', () => {
  const path = makeZonePath(seededRng(4), { speed: 0.6 });
  for (let t = 0; t < 20; t += 0.1) {
    const p = path(t);
    assert.ok(p.x > 0.15 && p.x < 0.85 && p.y > 0.2 && p.y < 0.8, `${p.x},${p.y}`);
  }
});

// ───────── 꾹 버티기 ─────────

function playHold(id, policy) {
  const tune = tuneFor(id);
  const st = holdState(0.3);
  const dt = 1 / 60;
  let inside = 0;
  for (let t = 0; t < tune.duration; t += dt) {
    const band = holdBand(t, tune);
    holdStep(st, dt, policy(st, band, t), tune, t);
    inside += bandCover(st.v, band) * dt;
  }
  return holdScore(inside / tune.duration);
}

test('꾹 버티기: 누르면 오르고 떼면 내려가며 0..1 밖으로 나가지 않는다', () => {
  const tune = { lift: 2.5, gravity: 1.9, damp: 2.4, wobble: 0 };
  const up = holdState(0.5);
  for (let i = 0; i < 30; i++) holdStep(up, 1 / 60, true, tune, i / 60);
  assert.ok(up.v > 0.5);
  const down = holdState(0.5);
  for (let i = 0; i < 30; i++) holdStep(down, 1 / 60, false, tune, i / 60);
  assert.ok(down.v < 0.5);
  const st = holdState(0.5);
  for (let i = 0; i < 600; i++) holdStep(st, 1 / 60, i % 200 < 100, { ...tune, wobble: 3 }, i / 60);
  assert.ok(st.v >= 0 && st.v <= 1);
  assert.equal(bandCover(0.5, { center: 0.5, half: 0.1 }), 1);
  assert.equal(bandCover(0.9, { center: 0.5, half: 0.1 }), 0);
});

test('꾹 버티기: 잘 맞추면 만점 가까이, 대충 하면 중간, 손 놓으면 낮다', () => {
  for (const id of ['streetlamp', 'stadium']) {
    // 숙련: 속도까지 보고 누른다
    const skilled = playHold(id, (st, b) => st.v + st.vel * 0.22 < b.center);
    // 보통: 칸 가운데보다 낮으면 누르지만 0.22초 늦게 보고, 한 번 정한 손은 0.15초쯤 유지한다
    const memo = [];
    let cur = false;
    let held = 0;
    const average = playHold(id, (st, b) => {
      memo.push(st.v < b.center);
      held++;
      const want = memo[Math.max(0, memo.length - 14)];
      if (want !== cur && held >= 9) {
        cur = want;
        held = 0;
      }
      return cur;
    });
    const idle = playHold(id, () => false);
    const mash = playHold(id, () => true);
    assert.ok(skilled >= 0.85, `${id} 숙련 ${skilled}`);
    assert.ok(average >= 0.3 && average <= 0.85, `${id} 보통 ${average}`);
    assert.ok(idle < 0.2 && mash < 0.2, `${id} 손 놓기 ${idle} / 계속 누르기 ${mash}`);
  }
});

// ───────── 이리저리 피하기 ─────────

test('이리저리 피하기: 세 칸을 다 막는 물결은 없고, 물결은 시간 순서다', () => {
  for (const id of ['highway', 'airport']) {
    const tune = tuneFor(id);
    for (let seed = 1; seed <= 20; seed++) {
      const waves = laneWaves(seededRng(seed), tune);
      assert.ok(waves.length >= 6, `${id} 물결 수 ${waves.length}`);
      for (let i = 0; i < waves.length; i++) {
        const w = waves[i];
        assert.ok(w.lanes.length >= 1 && w.lanes.length <= 2);
        assert.ok(w.lanes.every((l) => l >= 0 && l <= 2));
        assert.ok(w.t < tune.duration);
        if (i) assert.ok(w.t - waves[i - 1].t >= tune.interval[0] - 1e-9);
      }
      if (id === 'highway') assert.ok(waves.every((w) => w.kind === 'car'));
    }
  }
  assert.equal(lanesScore({ hits: 0, total: 10 }), 1);
  assert.ok(near(lanesScore({ hits: 2, total: 10 }), 0.5));
  assert.equal(lanesScore({ hits: 9, total: 10 }), 0);
  assert.equal(lanesScore({ hits: 0, total: 0 }), 1);
});

// ───────── 박자 맞추기 ─────────

test('박자 판정 창', () => {
  assert.equal(judgeOffset(0), 'perfect');
  assert.equal(judgeOffset(-0.05), 'perfect');
  assert.equal(judgeOffset(0.1), 'good');
  assert.equal(judgeOffset(-0.18), 'ok');
  assert.equal(judgeOffset(0.25), null);
  assert.equal(judgeOffset(NaN), null);
  assert.ok(WINDOWS.perfect < WINDOWS.good && WINDOWS.good < WINDOWS.ok);
});

test('박자표: 박자에 맞고, 처음 네 박은 빠짐없다', () => {
  for (const id of ['fireworks', 'forecast']) {
    const tune = tuneFor(id);
    const beat = 60 / tune.bpm;
    const notes = rhythmChart(seededRng(5), tune);
    assert.ok(notes.length >= 7, `${id} 음표 ${notes.length}`);
    for (let i = 1; i < notes.length; i++) assert.ok(notes[i] > notes[i - 1]);
    for (let i = 0; i < 4; i++) assert.ok(near(notes[i], tune.lead + i * beat, 1e-9));
    for (const n of notes) {
      const k = (n - tune.lead) / (beat / 2);
      assert.ok(near(k, Math.round(k), 1e-6), '반 박 단위');
      assert.ok(n < tune.duration);
    }
  }
});

test('박자 맞추기: 누름 판정, 놓침, 헛손질', () => {
  const st = rhythmState([1, 2, 3, 4]);
  assert.deepEqual(rhythmTap(st, 1.02), { index: 0, judge: 'perfect', offset: 1.02 - 1 });
  assert.equal(rhythmTap(st, 2.1).judge, 'good');
  assert.equal(rhythmTap(st, 2.5).judge, 'stray', '음표 사이 헛손질');
  assert.equal(rhythmTap(st, 2.11).judge, 'stray', '이미 친 음표는 다시 못 친다');
  assert.deepEqual(rhythmExpire(st, 3.3), [2]);
  assert.equal(st.combo, 0);
  assert.equal(rhythmTap(st, 3.85).judge, 'ok');
  assert.equal(st.judged.join(','), 'perfect,good,miss,ok');
  assert.equal(st.strays, 2);
  assert.equal(st.best, 2);
  assert.equal(rhythmScore({ credit: 4, total: 4 }), 1);
  assert.ok(near(rhythmScore({ credit: 1 + 0.65 + 0 + 0.3, total: 4, strays: 2 }), (1.95 - 0.5) / 3.8));
  assert.equal(rhythmScore({ credit: 0, total: 0 }), 0.5);
});

test('박자 맞추기: 숙련자는 만점 가까이, 보통은 중간', () => {
  const tune = tuneFor('forecast');
  const notes = rhythmChart(seededRng(2), tune);
  const run = (sd, missP, seed) => {
    const rng = seededRng(seed);
    const st = rhythmState(notes);
    for (const n of notes) {
      if (rng() < missP) continue;
      // 정규분포 근사(균등분포 셋의 합, 표준편차 sd)
      const err = ((rng() + rng() + rng() - 1.5) / 0.5) * sd;
      rhythmTap(st, n + err);
    }
    rhythmExpire(st, 99);
    return rhythmScore({ credit: st.credit, total: notes.length, strays: st.strays });
  };
  const skilled = avg([1, 2, 3, 4, 5].map((s) => run(0.035, 0, s)));
  const average = avg([1, 2, 3, 4, 5].map((s) => run(0.09, 0.06, s)));
  assert.ok(skilled >= 0.9, `숙련 ${skilled}`);
  assert.ok(average >= 0.45 && average <= 0.8, `보통 ${average}`);
});

// ───────── 문구와 안전장치 ─────────

test('미니게임 문구: 모든 임무와 틀, 등급에 한국어·영어 문구가 있다', async () => {
  await import('../src/ui/minigames/strings.js');
  const { t, setLang } = await import('../src/i18n/index.js');
  for (const lang of ['ko', 'en']) {
    setLang(lang);
    for (const m of MISSIONS) {
      const how = t(`minigame.how.${m.id}`);
      assert.ok(how && how !== `minigame.how.${m.id}`, `${lang} how ${m.id}`);
    }
    for (const tpl of TEMPLATES) {
      assert.notEqual(t(`minigame.tpl.${tpl}`), `minigame.tpl.${tpl}`, `${lang} tpl ${tpl}`);
      assert.notEqual(t(`minigame.meter.${tpl}`), `minigame.meter.${tpl}`, `${lang} meter ${tpl}`);
    }
    for (const g of ['perfect', 'good', 'close', 'bad']) assert.notEqual(t(`minigame.grade.${g}`), `minigame.grade.${g}`);
    assert.ok(!t('minigame.effect', { risk: '-35%', gain: '+30%' }).includes('{'));
  }
  setLang('ko');
});

test('playMinigame 은 화면이 없거나 잘못된 값이어도 예외 없이 0.5 로 끝난다', async () => {
  const { playMinigame } = await import('../src/ui/minigames/index.js');
  assert.equal(await playMinigame(null, 'crop'), 0.5);
  assert.equal(await playMinigame({}, 'moon'), 0.5);
  assert.equal(await playMinigame({ stage: null }, '없는임무'), 0.5);
});
