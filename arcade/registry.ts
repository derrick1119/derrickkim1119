/**
 * 공장이 만든 게임 목록 — **지금 오너 앞에 있는 게임만** 둔다.
 * 오너(2026-11-07): "선택 받지 못한 아이디어는 폐기해서 보여주지마. 다음 라운드 후보가 너무 많다."
 * → 라운드에서 진 게임은 여기와 `arcade/games/`에서 지우고 `ab.json`의 `discarded`에 이름·재료만 남긴다.
 * 졸업한 게임은 스튜디오(`studio/<게임>/`)가 이어받는다(원본 `games/guardian2.ts`·`sheepdog.ts`·`balloonpop.ts`·`duckbath.ts`는 스튜디오 참고용으로 파일만 남김).
 */
import type { Bot, GameDef } from './core.ts';
import { screwshop, screwshopRandom, screwshopSmart } from './games/screwshop.ts';
import { animalbus, animalbusRandom, animalbusSmart } from './games/animalbus.ts';
import { blockgarden, blockgardenRandom, blockgardenSmart } from './games/blockgarden.ts';
import { catcards, catcardsRandom, catcardsSmart } from './games/catcards.ts';
import { bubbleshot, bubbleshotRandom, bubbleshotSmart } from './games/bubbleshot.ts';

export interface Entry<S = any> { game: GameDef<S>; dumb: Bot<S>; smart: Bot<S> }

export const GAMES: Entry[] = [
  // 25라운드 — 요즘 잘 팔리는 캐주얼 퍼즐 뼈대 × 공장의 와우 (24라운드 다 폐기 뒤)
  { game: screwshop, dumb: screwshopRandom, smart: screwshopSmart },
  { game: animalbus, dumb: animalbusRandom, smart: animalbusSmart },
  { game: blockgarden, dumb: blockgardenRandom, smart: blockgardenSmart },
  { game: catcards, dumb: catcardsRandom, smart: catcardsSmart },
  { game: bubbleshot, dumb: bubbleshotRandom, smart: bubbleshotSmart },
];
