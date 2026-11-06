/** 공장이 만든 게임 목록. 새 게임은 여기에 등록한다 */
import type { Bot, GameDef } from './core.ts';
import { brickChase, brickdef, brickIdle } from './games/brickdef.ts';
import { orbit, orbitRandom, orbitSmart } from './games/orbit.ts';

export interface Entry<S = any> { game: GameDef<S>; dumb: Bot<S>; smart: Bot<S> }

export const GAMES: Entry[] = [
  { game: orbit, dumb: orbitRandom, smart: orbitSmart },
  { game: brickdef, dumb: brickIdle, smart: brickChase },
];
