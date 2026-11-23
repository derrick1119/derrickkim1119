/**
 * 공장이 만든 게임 목록 — **지금 오너 앞에 있는 게임만** 둔다.
 * 오너(2026-11-07): "선택 받지 못한 아이디어는 폐기해서 보여주지마. 다음 라운드 후보가 너무 많다."
 * → 라운드에서 진 게임은 여기와 `arcade/games/`에서 지우고 `ab.json`의 `discarded`에 이름·재료만 남긴다.
 * 졸업한 게임은 스튜디오(`studio/<게임>/`)가 이어받는다(원본 `games/guardian2.ts`·`sheepdog.ts`·`balloonpop.ts`·`duckbath.ts`·`screwshop.ts`·`animalbus.ts`·`demolition.ts`·`potionsort.ts`·`bodyhop.ts`·`slowdash.ts`·`petsquad.ts`는 스튜디오 참고용으로 파일만 남김).
 */
import type { Bot, GameDef } from './core.ts';
import { hauntfamily, hauntfamilyRandom, hauntfamilySmart, hauntfamilyHabit, hauntfamilyHabit2 } from './games/hauntfamily.ts';
import { cheesemouse, cheesemouseRandom, cheesemouseSmart, cheesemouseHabit, cheesemouseHabit2 } from './games/cheesemouse.ts';
import { castlegiant, castlegiantRandom, castlegiantSmart, castlegiantHabit, castlegiantHabit2 } from './games/castlegiant.ts';

/** habits: 늘 같은 버릇대로 하는 봇들(기준 13, 0081 계기판 '버릇 격차') */
export interface Entry<S = any> { game: GameDef<S>; dumb: Bot<S>; smart: Bot<S>; habits?: Bot<S>[] }

export const GAMES: Entry[] = [
  // 43라운드(2026-11-23): 오너가 아이디어 메뉴에서 고른 셋(3·4·5)
  { game: hauntfamily, dumb: hauntfamilyRandom, smart: hauntfamilySmart, habits: [hauntfamilyHabit, hauntfamilyHabit2] },
  { game: cheesemouse, dumb: cheesemouseRandom, smart: cheesemouseSmart, habits: [cheesemouseHabit, cheesemouseHabit2] },
  { game: castlegiant, dumb: castlegiantRandom, smart: castlegiantSmart, habits: [castlegiantHabit, castlegiantHabit2] },
];
