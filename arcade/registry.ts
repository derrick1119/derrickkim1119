/**
 * 공장이 만든 게임 목록 — **지금 오너 앞에 있는 게임만** 둔다.
 * 오너(2026-11-07): "선택 받지 못한 아이디어는 폐기해서 보여주지마. 다음 라운드 후보가 너무 많다."
 * → 라운드에서 진 게임은 여기와 `arcade/games/`에서 지우고 `ab.json`의 `discarded`에 이름·재료만 남긴다.
 * 졸업한 게임은 스튜디오(`studio/<게임>/`)가 이어받는다(원본 `games/guardian2.ts`·`sheepdog.ts`·`balloonpop.ts`·`duckbath.ts`·`screwshop.ts`·`animalbus.ts`·`demolition.ts`·`potionsort.ts`는 스튜디오 참고용으로 파일만 남김).
 */
import type { Bot, GameDef } from './core.ts';
import { polarflip, polarflipRandom, polarflipSmart } from './games/polarflip.ts';
import { snailslide, snailslideRandom, snailslideSmart } from './games/snailslide.ts';
import { boomerang, boomerangRandom, boomerangSmart } from './games/boomerang.ts';
import { pulleylift, pulleyliftRandom, pulleyliftSmart } from './games/pulleylift.ts';
import { ghostlight, ghostlightRandom, ghostlightSmart } from './games/ghostlight.ts';
import { mirrorcats, mirrorcatsRandom, mirrorcatsSmart } from './games/mirrorcats.ts';

export interface Entry<S = any> { game: GameDef<S>; dumb: Bot<S>; smart: Bot<S> }

export const GAMES: Entry[] = [
  // 28라운드(2026-11-16): 처음 보는 규칙 6개
  { game: polarflip, dumb: polarflipRandom, smart: polarflipSmart },
  { game: snailslide, dumb: snailslideRandom, smart: snailslideSmart },
  { game: boomerang, dumb: boomerangRandom, smart: boomerangSmart },
  { game: pulleylift, dumb: pulleyliftRandom, smart: pulleyliftSmart },
  { game: ghostlight, dumb: ghostlightRandom, smart: ghostlightSmart },
  { game: mirrorcats, dumb: mirrorcatsRandom, smart: mirrorcatsSmart },
];
