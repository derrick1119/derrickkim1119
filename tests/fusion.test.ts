import { describe, expect, it } from 'vitest';
import { deduce } from '../engine/deducer.ts';
import { buildModel, givenState, satisfiesAll } from '../engine/model.ts';
import { hashString, mulberry32, shuffle } from '../engine/rng.ts';
import { countSolutions } from '../engine/solver.ts';
import { ATOMS, connectedPartial } from '../fusion/atoms.ts';
import { analyzePuzzle } from '../fusion/analyze.ts';
import { allAtomsNecessary, generateFusion } from '../fusion/generator.ts';
import { sampleSolution } from '../fusion/sampler.ts';
import { allSpecs, buildFusionRules, fusionId, fusionName, knownGenre, parseFusionId, validSpec } from '../fusion/spec.ts';

describe('fusion spec', () => {
  it('round-trips every valid spec id', () => {
    const specs = allSpecs();
    expect(specs.length).toBeGreaterThan(300);
    for (const s of specs) expect(parseFusionId(fusionId(s))).toEqual({ ...s, globals: [...s.globals].sort() });
  });
  it('rejects clue-less and incompatible specs', () => {
    expect(validSpec({ cell: null, edge: null, globals: ['nothree'] })).toBe(false);
    expect(validSpec({ cell: 'nb8', edge: null, globals: ['notouch', 'kingtouch'] })).toBe(false);
    expect(validSpec({ cell: 'nb8', edge: null, globals: ['kline'] })).toBe(true);
  });
  it('flags well-known genres', () => {
    expect(knownGenre(parseFusionId('fx-givens-x-balanced.nothree')!)).toBeTruthy();
    expect(knownGenre(parseFusionId('fx-nb8-x-x')!)).toBeTruthy();
    expect(knownGenre(parseFusionId('fx-knight-x-balanced')!)).toBeNull();
  });
  it('names use correct Korean particles', () => {
    const bad = /[가-힣]/u;
    for (const sp of allSpecs()) {
      const name = fusionName(sp);
      for (const m of name.matchAll(/([가-힣])(와|과|를|을) /gu)) {
        const code = m[1].charCodeAt(0) - 0xac00;
        const batchim = code % 28 !== 0;
        const ok = batchim ? m[2] === '과' || m[2] === '을' : m[2] === '와' || m[2] === '를';
        expect(ok, name).toBe(true);
      }
      expect(bad.test(name)).toBe(true);
    }
  });
});

describe('connectivity atom', () => {
  it('detects a split region in a partial state', () => {
    // 3x1: 빈 · 칠함 · 빈 → 빈칸이 끊김
    expect(connectedPartial(Int8Array.from([0, 1, 0]), 3, 1, 0)).toBe(false);
    expect(connectedPartial(Int8Array.from([0, -1, 0]), 3, 1, 0)).toBe(true);
  });
});

describe('sampler', () => {
  it('produces grids that satisfy every global atom', () => {
    const rng = mulberry32(3);
    for (const id of ['fx-knight-x-balanced.nothree', 'fx-nb8-x-kline', 'fx-rook-x-conne.notouch', 'fx-orth4-x-connf.no2x2f']) {
      const spec = parseFusionId(id)!;
      const sol = sampleSolution(spec, 6, 6, rng, 20000);
      expect(sol, id).not.toBeNull();
      const rules = buildFusionRules({ ...spec, cell: null, edge: null });
      const m = buildModel({ rules: rules.id, width: 6, height: 6, clues: Array(36).fill(null) }, rules);
      expect(satisfiesAll(m, Int8Array.from(sol!)), id).toBe(true);
    }
  });
});

describe('fusion generator (random sample of the space)', () => {
  const specs = shuffle(allSpecs(), mulberry32(hashString('fusion-test'))).slice(0, 14);
  for (const spec of specs) {
    it(`${fusionId(spec)}: any generated puzzle is unique and soundly solvable`, () => {
      const p = generateFusion(spec, { width: 6, height: 6, seed: 99, target: 'hard', attempts: 6 });
      if (!p) return; // 생성 불가 조합은 탐색이 0점 처리 — 여기선 건전성만 본다
      const rules = buildFusionRules(spec);
      const proof = countSolutions(p, rules, 2);
      expect(proof.count).toBe(1);
      expect(Array.from(proof.first!).join('')).toBe(p.solution);
      const m = buildModel(p, rules);
      const r = deduce(m, givenState(m));
      expect(r.solved).toBe(true);
      for (const s of r.steps) for (const c of s.cells) expect(String(s.value)).toBe(p.solution[c]);
    });
  }
});

describe('analyzer', () => {
  it('single-atom fusions have zero synergy', () => {
    const spec = parseFusionId('fx-knight-x-x')!;
    const p = generateFusion(spec, { width: 6, height: 6, seed: 5, target: 'hard' })!;
    expect(analyzePuzzle(spec, p).cross).toBe(0);
  });
  it('a known strong fusion needs both of its atoms', () => {
    const spec = parseFusionId('fx-knight-x-balanced')!;
    const p = generateFusion(spec, { width: 6, height: 6, seed: 5, target: 'hard' })!;
    const a = analyzePuzzle(spec, p);
    expect(a.necessary.knight).toBe(true);
    expect(a.necessary.balanced).toBe(true);
  });
  it('every atom has player-facing text', () => {
    for (const a of Object.values(ATOMS)) {
      expect(a.rule.length).toBeGreaterThan(8);
      expect(a.origin.length).toBeGreaterThan(1);
      expect(a.hint(0, 1).length).toBeGreaterThan(5);
    }
  });
});

describe('redundant pairs (실험 0002)', () => {
  it('kingtouch implies conne on every 4×4 and 3×5 board', () => {
    for (const [w, h] of [[4, 4], [3, 5]]) {
      const n = w * h;
      for (let mask = 0; mask < 1 << n; mask++) {
        const s = new Int8Array(n);
        for (let i = 0; i < n; i++) s[i] = (mask >> i) & 1;
        let touch = false;
        for (let i = 0; i < n && !touch; i++) {
          if (!s[i]) continue;
          const x = i % w, y = (i / w) | 0;
          for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < w && ny < h && s[ny * w + nx]) touch = true;
          }
        }
        if (!touch) expect(connectedPartial(s, w, h, 0)).toBe(true);
      }
    }
    expect(validSpec({ cell: 'nb8', edge: null, globals: ['conne', 'kingtouch'] })).toBe(false);
  });
});

describe('requireAllAtoms (실험 0004)', () => {
  it('keeps only puzzles where every atom is needed', () => {
    const spec = parseFusionId('fx-nb8-x-conne')!;
    const p = generateFusion(spec, { width: 6, height: 6, seed: 9001, target: 'hard', attempts: 30, requireAllAtoms: true });
    expect(p).not.toBeNull();
    expect(allAtomsNecessary(spec, p!)).toBe(true);
  });
});
