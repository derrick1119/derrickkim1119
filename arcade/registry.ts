/**
 * 공장이 만든 게임 목록 — **지금 오너 앞에 있는 게임만** 둔다.
 * 오너(2026-11-07): "선택 받지 못한 아이디어는 폐기해서 보여주지마. 다음 라운드 후보가 너무 많다."
 * → 라운드에서 진 게임은 여기와 `arcade/games/`에서 지우고 `ab.json`의 `discarded`에 이름·재료만 남긴다.
 * 졸업한 게임은 스튜디오(`studio/<게임>/`)가 이어받는다(행성 수호대 2의 원본 `games/guardian2.ts`는 스튜디오 참고용으로 파일만 남김).
 */
import type { Bot, GameDef } from './core.ts';
import { volcano, volcanoRandom, volcanoSmart } from './games/volcano.ts';
import { turtle, turtleRandom, turtleSmart } from './games/turtle.ts';
import { stretchcat, stretchcatRandom, stretchcatSmart } from './games/stretchcat.ts';
import { hedgehog, hedgehogRandom, hedgehogSmart } from './games/hedgehog.ts';
import { elephant, elephantRandom, elephantSmart } from './games/elephant.ts';
import { puffer, pufferRandom, pufferSmart } from './games/puffer.ts';
import { bakery, bakeryRandom, bakerySmart } from './games/bakery.ts';
import { eggcannon, eggcannonRandom, eggcannonSmart } from './games/eggcannon.ts';

export interface Entry<S = any> { game: GameDef<S>; dumb: Bot<S>; smart: Bot<S> }

export const GAMES: Entry[] = [
  { game: volcano, dumb: volcanoRandom, smart: volcanoSmart },
  { game: turtle, dumb: turtleRandom, smart: turtleSmart },
  { game: stretchcat, dumb: stretchcatRandom, smart: stretchcatSmart },
  { game: hedgehog, dumb: hedgehogRandom, smart: hedgehogSmart },
  { game: elephant, dumb: elephantRandom, smart: elephantSmart },
  { game: puffer, dumb: pufferRandom, smart: pufferSmart },
  { game: bakery, dumb: bakeryRandom, smart: bakerySmart },
  { game: eggcannon, dumb: eggcannonRandom, smart: eggcannonSmart },
];
