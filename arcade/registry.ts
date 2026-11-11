/**
 * 공장이 만든 게임 목록 — **지금 오너 앞에 있는 게임만** 둔다.
 * 오너(2026-11-07): "선택 받지 못한 아이디어는 폐기해서 보여주지마. 다음 라운드 후보가 너무 많다."
 * → 라운드에서 진 게임은 여기와 `arcade/games/`에서 지우고 `ab.json`의 `discarded`에 이름·재료만 남긴다.
 * 졸업한 게임은 스튜디오(`studio/<게임>/`)가 이어받는다(행성 수호대 2의 원본 `games/guardian2.ts`는 스튜디오 참고용으로 파일만 남김).
 */
import type { Bot, GameDef } from './core.ts';
import { sheepdog, sheepdogRandom, sheepdogSmart } from './games/sheepdog.ts';
import { balloonpop, balloonpopRandom, balloonpopSmart } from './games/balloonpop.ts';
import { clawgame, clawgameRandom, clawgameSmart } from './games/clawgame.ts';
import { duckbath, duckbathRandom, duckbathSmart } from './games/duckbath.ts';
import { grocery, groceryRandom, grocerySmart } from './games/grocery.ts';
import { plinko, plinkoRandom, plinkoSmart } from './games/plinko.ts';

export interface Entry<S = any> { game: GameDef<S>; dumb: Bot<S>; smart: Bot<S> }

export const GAMES: Entry[] = [
  // 23라운드 — 완전히 다른 장르 6개 (오너 답 "1")
  { game: sheepdog, dumb: sheepdogRandom, smart: sheepdogSmart },
  { game: balloonpop, dumb: balloonpopRandom, smart: balloonpopSmart },
  { game: clawgame, dumb: clawgameRandom, smart: clawgameSmart },
  { game: duckbath, dumb: duckbathRandom, smart: duckbathSmart },
  { game: grocery, dumb: groceryRandom, smart: grocerySmart },
  { game: plinko, dumb: plinkoRandom, smart: plinkoSmart },
];
