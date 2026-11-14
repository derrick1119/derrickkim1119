/**
 * 공장이 만든 게임 목록 — **지금 오너 앞에 있는 게임만** 둔다.
 * 오너(2026-11-07): "선택 받지 못한 아이디어는 폐기해서 보여주지마. 다음 라운드 후보가 너무 많다."
 * → 라운드에서 진 게임은 여기와 `arcade/games/`에서 지우고 `ab.json`의 `discarded`에 이름·재료만 남긴다.
 * 졸업한 게임은 스튜디오(`studio/<게임>/`)가 이어받는다(원본 `games/guardian2.ts`·`sheepdog.ts`·`balloonpop.ts`·`duckbath.ts`·`screwshop.ts`·`animalbus.ts`·`demolition.ts`·`potionsort.ts`는 스튜디오 참고용으로 파일만 남김).
 */
import type { Bot, GameDef } from './core.ts';
import { numpair, numpairRandom, numpairSmart } from './games/numpair.ts';
import { cardpeaks, cardpeaksRandom, cardpeaksSmart } from './games/cardpeaks.ts';
import { flipduel, flipduelRandom, flipduelSmart } from './games/flipduel.ts';
import { dicehand, dicehandRandom, dicehandSmart } from './games/dicehand.ts';
import { pipespin, pipespinRandom, pipespinSmart } from './games/pipespin.ts';
import { frogjump, frogjumpRandom, frogjumpSmart } from './games/frogjump.ts';

export interface Entry<S = any> { game: GameDef<S>; dumb: Bot<S>; smart: Bot<S> }

export const GAMES: Entry[] = [
  // 27라운드 — 전략이 깊은 검증된 캐주얼 뼈대 6개 (숙련 격차 목표 ≥ 6)
  { game: numpair, dumb: numpairRandom, smart: numpairSmart },
  { game: cardpeaks, dumb: cardpeaksRandom, smart: cardpeaksSmart },
  { game: flipduel, dumb: flipduelRandom, smart: flipduelSmart },
  { game: dicehand, dumb: dicehandRandom, smart: dicehandSmart },
  { game: pipespin, dumb: pipespinRandom, smart: pipespinSmart },
  { game: frogjump, dumb: frogjumpRandom, smart: frogjumpSmart },
];
