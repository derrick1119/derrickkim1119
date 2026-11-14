/**
 * 공장이 만든 게임 목록 — **지금 오너 앞에 있는 게임만** 둔다.
 * 오너(2026-11-07): "선택 받지 못한 아이디어는 폐기해서 보여주지마. 다음 라운드 후보가 너무 많다."
 * → 라운드에서 진 게임은 여기와 `arcade/games/`에서 지우고 `ab.json`의 `discarded`에 이름·재료만 남긴다.
 * 졸업한 게임은 스튜디오(`studio/<게임>/`)가 이어받는다(원본 `games/guardian2.ts`·`sheepdog.ts`·`balloonpop.ts`·`duckbath.ts`·`screwshop.ts`·`animalbus.ts`·`demolition.ts`는 스튜디오 참고용으로 파일만 남김).
 */
import type { Bot, GameDef } from './core.ts';
import { dropmerge, dropmergeRandom, dropmergeSmart } from './games/dropmerge.ts';
import { pullpin, pullpinRandom, pullpinSmart } from './games/pullpin.ts';
import { leashtangle, leashtangleRandom, leashtangleSmart } from './games/leashtangle.ts';
import { toypile, toypileRandom, toypileSmart } from './games/toypile.ts';
import { potionsort, potionsortRandom, potionsortSmart } from './games/potionsort.ts';
import { picnicswap, picnicswapRandom, picnicswapSmart } from './games/picnicswap.ts';

export interface Entry<S = any> { game: GameDef<S>; dumb: Bot<S>; smart: Bot<S> }

export const GAMES: Entry[] = [
  // 26라운드 — 검증된 요즘 캐주얼 뼈대 2탄: 물리 디오라마 넷(떨구기 합체·핀 뽑기·꼬인 줄·장난감 더미) + 추상 둘(물약 정렬·3매치)
  { game: dropmerge, dumb: dropmergeRandom, smart: dropmergeSmart },
  { game: pullpin, dumb: pullpinRandom, smart: pullpinSmart },
  { game: leashtangle, dumb: leashtangleRandom, smart: leashtangleSmart },
  { game: toypile, dumb: toypileRandom, smart: toypileSmart },
  { game: potionsort, dumb: potionsortRandom, smart: potionsortSmart },
  { game: picnicswap, dumb: picnicswapRandom, smart: picnicswapSmart },
];
