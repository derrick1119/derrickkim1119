import type { RuleSet } from '../types.ts';
import { echo } from './echo.ts';
import { makeFamily, parseFamilyId } from './family.ts';

/** 새 규칙은 여기에 등록한다. 공장 루프가 규칙을 추가/비교하는 진입점. */
export const RULESETS: Record<string, RuleSet> = {
  [echo.id]: echo,
};

export function getRules(id: string): RuleSet {
  const r = RULESETS[id];
  if (r) return r;
  const fam = parseFamilyId(id);
  if (fam) return (RULESETS[id] = makeFamily(fam));
  throw new Error(`unknown ruleset: ${id}`);
}
