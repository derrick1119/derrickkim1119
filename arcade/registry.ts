/**
 * 공장이 만든 게임 목록 — **지금 오너 앞에 있는 게임만** 둔다.
 * 오너(2026-11-07): "선택 받지 못한 아이디어는 폐기해서 보여주지마. 다음 라운드 후보가 너무 많다."
 * → 라운드에서 진 게임은 여기와 `arcade/games/`에서 지우고 `ab.json`의 `discarded`에 이름·재료만 남긴다.
 * 졸업한 게임은 스튜디오(`studio/<게임>/`)가 이어받는다(행성 수호대 2의 원본 `games/guardian2.ts`는 스튜디오 참고용으로 파일만 남김).
 */
import type { Bot, GameDef } from './core.ts';
import { fortress, fortressRandom, fortressSmart } from './games/fortress.ts';
import { flood, floodRandom, floodSmart } from './games/flood.ts';
import { typhoon, typhoonRandom, typhoonSmart } from './games/typhoon.ts';
import { quake, quakeRandom, quakeSmart } from './games/quake.ts';
import { landslide, landslideRandom, landslideSmart } from './games/landslide.ts';
import { sandcastle, sandcastleRandom, sandcastleSmart } from './games/sandcastle.ts';

export interface Entry<S = any> { game: GameDef<S>; dumb: Bot<S>; smart: Bot<S> }

export const GAMES: Entry[] = [
  // 21라운드 — 지어서 버티기 (오너 아이디어 둘 + 변형 넷)
  { game: fortress, dumb: fortressRandom, smart: fortressSmart },
  { game: flood, dumb: floodRandom, smart: floodSmart },
  { game: typhoon, dumb: typhoonRandom, smart: typhoonSmart },
  { game: quake, dumb: quakeRandom, smart: quakeSmart },
  { game: landslide, dumb: landslideRandom, smart: landslideSmart },
  { game: sandcastle, dumb: sandcastleRandom, smart: sandcastleSmart },
];
