/**
 * 공장이 만든 게임 목록 — **지금 오너 앞에 있는 게임만** 둔다.
 * 오너(2026-11-07): "선택 받지 못한 아이디어는 폐기해서 보여주지마. 다음 라운드 후보가 너무 많다."
 * → 라운드에서 진 게임은 여기와 `arcade/games/`에서 지우고 `ab.json`의 `discarded`에 이름·재료만 남긴다.
 * 졸업한 게임은 스튜디오(`studio/<게임>/`)가 이어받는다(원본 `games/guardian2.ts`·`sheepdog.ts`·`balloonpop.ts`·`duckbath.ts`·`screwshop.ts`·`animalbus.ts`·`demolition.ts`·`potionsort.ts`는 스튜디오 참고용으로 파일만 남김).
 */
import type { Bot, GameDef } from './core.ts';
import { beeswarm, beeswarmRandom, beeswarmSmart } from './games/beeswarm.ts';
import { kitefight, kitefightRandom, kitefightSmart } from './games/kitefight.ts';
import { whipcat, whipcatRandom, whipcatSmart } from './games/whipcat.ts';
import { slowdash, slowdashRandom, slowdashSmart } from './games/slowdash.ts';
import { magnethammer, magnethammerRandom, magnethammerSmart } from './games/magnethammer.ts';
import { firecat, firecatRandom, firecatSmart } from './games/firecat.ts';

export interface Entry<S = any> { game: GameDef<S>; dumb: Bot<S>; smart: Bot<S> }

export const GAMES: Entry[] = [
  // 31라운드(2026-11-18): 실시간 액션 6개 (오너 답: 첫인상·뻔함·그래픽 / 액션·실시간)
  { game: beeswarm, dumb: beeswarmRandom, smart: beeswarmSmart },
  { game: kitefight, dumb: kitefightRandom, smart: kitefightSmart },
  { game: whipcat, dumb: whipcatRandom, smart: whipcatSmart },
  { game: slowdash, dumb: slowdashRandom, smart: slowdashSmart },
  { game: magnethammer, dumb: magnethammerRandom, smart: magnethammerSmart },
  { game: firecat, dumb: firecatRandom, smart: firecatSmart },
];
