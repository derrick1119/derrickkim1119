import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// 0117: 아이디어 메뉴는 판정 직후 오너에게 바로 보이므로 미리 모양을 검사한다(계기판 메뉴 칸이 깨지지 않게)
const root = join(import.meta.dirname, '..', 'arcade');
const files = ['menu.json', ...readdirSync(join(root, 'menus')).filter((f) => f.endsWith('.json')).map((f) => `menus/${f}`)];
type Item = { no: number; emoji: string; name: string; from: string; wow: string; first: string; depth: string };

describe('아이디어 메뉴 모양 (0117)', () => {
  for (const f of files) {
    it(`${f}: 번호가 겹치지 않고, 아직 안 고른 메뉴(초안 포함)는 모든 칸이 차 있다`, () => {
      const m = JSON.parse(readFileSync(join(root, f), 'utf8'));
      expect(Number.isInteger(m.round)).toBe(true);
      const items: Item[] = [...m.items, ...(m.alternates ?? [])];
      expect(m.items.length).toBeGreaterThanOrEqual(2);
      expect(new Set(items.map((i) => i.no)).size).toBe(items.length);
      for (const i of items) for (const k of ['emoji', 'name', 'wow'] as const) expect(i[k], `${f} ${i.no} ${k}`).toBeTruthy();
      if (!m.picked) for (const i of items) for (const k of ['from', 'first', 'depth'] as const) expect(i[k], `${f} ${i.no} ${k}`).toBeTruthy();
    });
  }
});
