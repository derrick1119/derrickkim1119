/**
 * 공장이 만든 게임 목록 — **지금 오너 앞에 있는 게임만** 둔다.
 * 오너(2026-11-07): "선택 받지 못한 아이디어는 폐기해서 보여주지마. 다음 라운드 후보가 너무 많다."
 * → 라운드에서 진 게임은 여기와 `arcade/games/`에서 지우고 `ab.json`의 `discarded`에 이름·재료만 남긴다.
 * 졸업한 게임은 스튜디오(`studio/<게임>/`)가 이어받는다(원본 `games/guardian2.ts`·`sheepdog.ts`·`balloonpop.ts`·`duckbath.ts`·`screwshop.ts`·`animalbus.ts`·`demolition.ts`·`potionsort.ts`·`slowdash.ts`는 스튜디오 참고용으로 파일만 남김).
 */
import type { Bot, GameDef } from './core.ts';
import { alchemylab, alchemylabRandom, alchemylabSmart, alchemylabHabit, alchemylabHabit2 } from './games/alchemylab.ts';
import { petsquad, petsquadRandom, petsquadSmart, petsquadHabit, petsquadHabit2 } from './games/petsquad.ts';
import { tinykingdom, tinykingdomRandom, tinykingdomSmart, tinykingdomHabit, tinykingdomHabit2 } from './games/tinykingdom.ts';
import { reeftank, reeftankRandom, reeftankSmart, reeftankHabit, reeftankHabit2 } from './games/reeftank.ts';
import { petcafe, petcafeRandom, petcafeSmart, petcafeHabit, petcafeHabit2 } from './games/petcafe.ts';
import { treasuremap, treasuremapRandom, treasuremapSmart, treasuremapHabit, treasuremapHabit2 } from './games/treasuremap.ts';

/** habits: 늘 같은 버릇대로 하는 봇들(기준 13, 0081 계기판 '버릇 격차') */
export interface Entry<S = any> { game: GameDef<S>; dumb: Bot<S>; smart: Bot<S>; habits?: Bot<S>[] }

export const GAMES: Entry[] = [
  // 34라운드(2026-11-20): 완전히 다른 장르 6개, 톡 하나 — 오너 선택 대기
  { game: alchemylab, dumb: alchemylabRandom, smart: alchemylabSmart, habits: [alchemylabHabit, alchemylabHabit2] },
  { game: petsquad, dumb: petsquadRandom, smart: petsquadSmart, habits: [petsquadHabit, petsquadHabit2] },
  { game: tinykingdom, dumb: tinykingdomRandom, smart: tinykingdomSmart, habits: [tinykingdomHabit, tinykingdomHabit2] },
  { game: reeftank, dumb: reeftankRandom, smart: reeftankSmart, habits: [reeftankHabit, reeftankHabit2] },
  { game: petcafe, dumb: petcafeRandom, smart: petcafeSmart, habits: [petcafeHabit, petcafeHabit2] },
  { game: treasuremap, dumb: treasuremapRandom, smart: treasuremapSmart, habits: [treasuremapHabit, treasuremapHabit2] },
];
