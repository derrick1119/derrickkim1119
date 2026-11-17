/**
 * 공장이 만든 게임 목록 — **지금 오너 앞에 있는 게임만** 둔다.
 * 오너(2026-11-07): "선택 받지 못한 아이디어는 폐기해서 보여주지마. 다음 라운드 후보가 너무 많다."
 * → 라운드에서 진 게임은 여기와 `arcade/games/`에서 지우고 `ab.json`의 `discarded`에 이름·재료만 남긴다.
 * 졸업한 게임은 스튜디오(`studio/<게임>/`)가 이어받는다(원본 `games/guardian2.ts`·`sheepdog.ts`·`balloonpop.ts`·`duckbath.ts`·`screwshop.ts`·`animalbus.ts`·`demolition.ts`·`potionsort.ts`는 스튜디오 참고용으로 파일만 남김).
 */
import type { Bot, GameDef } from './core.ts';
import { ferrypark, ferryparkRandom, ferryparkSmart } from './games/ferrypark.ts';
import { yarncat, yarncatRandom, yarncatSmart } from './games/yarncat.ts';
import { pancake, pancakeRandom, pancakeSmart } from './games/pancake.ts';
import { movetruck, movetruckRandom, movetruckSmart } from './games/movetruck.ts';
import { honeybear, honeybearRandom, honeybearSmart } from './games/honeybear.ts';
import { toyescape, toyescapeRandom, toyescapeSmart } from './games/toyescape.ts';

export interface Entry<S = any> { game: GameDef<S>; dumb: Bot<S>; smart: Bot<S> }

export const GAMES: Entry[] = [
  // 29라운드(2026-11-17): 한눈에 아는 놀이 × 진짜 물리 6개
  { game: ferrypark, dumb: ferryparkRandom, smart: ferryparkSmart },
  { game: yarncat, dumb: yarncatRandom, smart: yarncatSmart },
  { game: pancake, dumb: pancakeRandom, smart: pancakeSmart },
  { game: movetruck, dumb: movetruckRandom, smart: movetruckSmart },
  { game: honeybear, dumb: honeybearRandom, smart: honeybearSmart },
  { game: toyescape, dumb: toyescapeRandom, smart: toyescapeSmart },
];
