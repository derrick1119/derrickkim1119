/** A|B 라운드 상태 계산 (0011). 순수 함수 — tests/ab.test.ts */
export interface Round {
  round: number;
  winner: string | null;
  openedAt?: string;
  remindedAt?: string | null;
}

export const REMIND_AFTER_HOURS = 24;

export function roundAgeHours(r: Round, now: Date): number | null {
  if (!r.openedAt) return null;
  return Math.max(0, (now.getTime() - Date.parse(r.openedAt)) / 3_600_000);
}

/** 열린 라운드가 24시간을 넘겼고 아직 한 번도 알리지 않았을 때만 true */
export function needsReminder(r: Round, now: Date): boolean {
  const age = roundAgeHours(r, now);
  return r.winner === null && !r.remindedAt && age !== null && age >= REMIND_AFTER_HOURS;
}

export const REMINDER_MARK = '<!-- ab-reminder -->';

/** STATE.md의 '## 오너에게' 바로 아래에 리마인드 한 줄을 넣는다. 이미 있으면 그대로 (멱등) */
export function addReminder(state: string, r: Round, ageHours: number): string {
  if (state.includes(`${REMINDER_MARK} ${r.round}라운드`)) return state;
  const line = `- ${REMINDER_MARK} ${r.round}라운드 A|B가 ${Math.floor(ageHours)}시간째 기다리고 있어요. 계기판에서 한 판씩 풀어보고 골라주세요 (채팅으로 "A"/"B"도 됩니다).`;
  return state.replace(/## 오너에게\n/, (h) => `${h}${line}\n`);
}
