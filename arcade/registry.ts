/**
 * 공장이 만든 게임 목록 — **지금 오너 앞에 있는 게임만** 둔다.
 * 오너(2026-11-07): "선택 받지 못한 아이디어는 폐기해서 보여주지마. 다음 라운드 후보가 너무 많다."
 * → 라운드에서 진 게임은 여기와 `arcade/games/`에서 지우고 `ab.json`의 `discarded`에 이름·재료만 남긴다.
 * 졸업한 게임은 스튜디오(`studio/<게임>/`)가 이어받는다(원본 `games/guardian2.ts`·`sheepdog.ts`·`balloonpop.ts`·`duckbath.ts`·`screwshop.ts`·`animalbus.ts`·`demolition.ts`·`potionsort.ts`·`bodyhop.ts`·`slowdash.ts`·`petsquad.ts`는 스튜디오 참고용으로 파일만 남김).
 */
import type { Bot, GameDef } from './core.ts';
import { shellswap, shellswapRandom, shellswapSmart, shellswapHabit, shellswapHabit2 } from './games/shellswap.ts';
import { colorsoul, colorsoulRandom, colorsoulSmart, colorsoulHabit, colorsoulHabit2 } from './games/colorsoul.ts';
import { eatdragon, eatdragonRandom, eatdragonSmart, eatdragonHabit, eatdragonHabit2 } from './games/eatdragon.ts';

/** habits: 늘 같은 버릇대로 하는 봇들(기준 13, 0081 계기판 '버릇 격차') */
export interface Entry<S = any> { game: GameDef<S>; dumb: Bot<S>; smart: Bot<S>; habits?: Bot<S>[] }

export const GAMES: Entry[] = [
  // 42라운드(2026-11-22): 톡마다 내가 바뀐다 — 공장이 고른 셋(41 전체 폐기 뒤 '공장이 알아서')
  { game: shellswap, dumb: shellswapRandom, smart: shellswapSmart, habits: [shellswapHabit, shellswapHabit2] },
  { game: colorsoul, dumb: colorsoulRandom, smart: colorsoulSmart, habits: [colorsoulHabit, colorsoulHabit2] },
  { game: eatdragon, dumb: eatdragonRandom, smart: eatdragonSmart, habits: [eatdragonHabit, eatdragonHabit2] },
];
