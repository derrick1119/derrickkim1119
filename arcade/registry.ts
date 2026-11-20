/**
 * 공장이 만든 게임 목록 — **지금 오너 앞에 있는 게임만** 둔다.
 * 오너(2026-11-07): "선택 받지 못한 아이디어는 폐기해서 보여주지마. 다음 라운드 후보가 너무 많다."
 * → 라운드에서 진 게임은 여기와 `arcade/games/`에서 지우고 `ab.json`의 `discarded`에 이름·재료만 남긴다.
 * 졸업한 게임은 스튜디오(`studio/<게임>/`)가 이어받는다(원본 `games/guardian2.ts`·`sheepdog.ts`·`balloonpop.ts`·`duckbath.ts`·`screwshop.ts`·`animalbus.ts`·`demolition.ts`·`potionsort.ts`·`slowdash.ts`·`petsquad.ts`는 스튜디오 참고용으로 파일만 남김).
 */
import type { Bot, GameDef } from './core.ts';
import { weightsteal, weightstealRandom, weightstealSmart, weightstealHabit, weightstealHabit2 } from './games/weightsteal.ts';
import { rewindone, rewindoneRandom, rewindoneSmart, rewindoneHabit, rewindoneHabit2 } from './games/rewindone.ts';
import { sizeswap, sizeswapRandom, sizeswapSmart, sizeswapHabit, sizeswapHabit2 } from './games/sizeswap.ts';

/** habits: 늘 같은 버릇대로 하는 봇들(기준 13, 0081 계기판 '버릇 격차') */
export interface Entry<S = any> { game: GameDef<S>; dumb: Bot<S>; smart: Bot<S>; habits?: Bot<S>[] }

export const GAMES: Entry[] = [
  // 38라운드(2026-11-20): 오너가 고른 아이디어 셋을 깊게 — 소리·판 사이 성장
  { game: weightsteal, dumb: weightstealRandom, smart: weightstealSmart, habits: [weightstealHabit, weightstealHabit2] },
  { game: rewindone, dumb: rewindoneRandom, smart: rewindoneSmart, habits: [rewindoneHabit, rewindoneHabit2] },
  { game: sizeswap, dumb: sizeswapRandom, smart: sizeswapSmart, habits: [sizeswapHabit, sizeswapHabit2] },
];
