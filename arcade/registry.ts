/** 공장이 만든 게임 목록. 새 게임은 여기에 등록한다 */
import type { Bot, GameDef } from './core.ts';
import { brickChase, brickdef, brickIdle } from './games/brickdef.ts';
import { guard, guardRandom, guardSmart } from './games/guard.ts';
import { mergetower, towerRandom, towerSmart } from './games/mergetower.ts';
import { orbit, orbitRandom, orbitSmart } from './games/orbit.ts';
import { stomp, stompRandom, stompSmart } from './games/stomp.ts';

export interface Entry<S = any> { game: GameDef<S>; dumb: Bot<S>; smart: Bot<S> }

export const GAMES: Entry[] = [
  { game: orbit, dumb: orbitRandom, smart: orbitSmart },
  { game: brickdef, dumb: brickIdle, smart: brickChase },
  { game: guard, dumb: guardRandom, smart: guardSmart },
  { game: mergetower, dumb: towerRandom, smart: towerSmart },
  { game: stomp, dumb: stompRandom, smart: stompSmart },
];
