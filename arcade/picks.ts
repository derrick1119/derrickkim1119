/**
 * 기계 추천 (0084·0114) — 계기판과 테스트가 같은 계산을 쓴다. 고르기는 오너 몫이고 이건 참고만(0101).
 * - 추천 1: 재미 추정 최고. 차가 0.005 안이면 숙련 격차가 큰 쪽.
 * - 추천 2(전략 깊이): 버릇대로만 하는 봇의 ★3 비율이 가장 낮은 것. 차가 0.005 안이면 버릇 격차가 큰 쪽.
 */
import type { ArcadeReport } from './evaluate.ts';

const TIE = 0.005;
type R = Pick<ArcadeReport, 'id' | 'fun' | 'skillGap' | 'habitGap' | 'habitStar3'>;

/** key 최고와 TIE 안에 드는 것들 중 tie가 가장 큰 것 */
function best(rs: R[], key: (r: R) => number, tie: (r: R) => number): string | undefined {
  const top = Math.max(...rs.map(key));
  return rs.filter((r) => top - key(r) < TIE).sort((a, b) => tie(b) - tie(a))[0]?.id;
}

export function machinePicks(rs: R[]): { pick1?: string; pick2?: string } {
  const withHabit = rs.filter((r) => r.habitStar3);
  return {
    pick1: best(rs, (r) => r.fun, (r) => r.skillGap),
    pick2: best(withHabit, (r) => -r.habitStar3!.rate, (r) => r.habitGap ?? 0),
  };
}
