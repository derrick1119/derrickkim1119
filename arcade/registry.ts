/**
 * 공장이 만든 게임 목록 — **지금 오너 앞에 있는 게임만** 둔다.
 * 오너(2026-11-07): "선택 받지 못한 아이디어는 폐기해서 보여주지마. 다음 라운드 후보가 너무 많다."
 * → 라운드에서 진 게임은 여기와 `arcade/games/`에서 지우고 `ab.json`의 `discarded`에 이름·재료만 남긴다.
 * 졸업한 게임은 스튜디오(`studio/<게임>/`)가 이어받는다(행성 수호대 2의 원본 `games/guardian2.ts`는 스튜디오 참고용으로 파일만 남김).
 */
import type { Bot, GameDef } from './core.ts';
import { sandcastle, sandcastleRandom, sandcastleSmart } from './games/sandcastle.ts';
import { turtlebeach, turtlebeachRandom, turtlebeachSmart } from './games/turtlebeach.ts';
import { crabpools, crabpoolsRandom, crabpoolsSmart } from './games/crabpools.ts';
import { igloo, iglooRandom, iglooSmart } from './games/igloo.ts';

export interface Entry<S = any> { game: GameDef<S>; dumb: Bot<S>; smart: Bot<S> }

export const GAMES: Entry[] = [
  // 22라운드 — 밀물 모래성 2(21라운드 선택, 다듬은 판) + 같은 결 새 아이디어 셋
  { game: sandcastle, dumb: sandcastleRandom, smart: sandcastleSmart },
  { game: turtlebeach, dumb: turtlebeachRandom, smart: turtlebeachSmart },
  { game: crabpools, dumb: crabpoolsRandom, smart: crabpoolsSmart },
  { game: igloo, dumb: iglooRandom, smart: iglooSmart },
];
