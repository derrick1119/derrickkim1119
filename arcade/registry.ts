/**
 * 공장이 만든 게임 목록 — **지금 오너 앞에 있는 게임만** 둔다.
 * 오너(2026-11-07): "선택 받지 못한 아이디어는 폐기해서 보여주지마. 다음 라운드 후보가 너무 많다."
 * → 라운드에서 진 게임은 여기와 `arcade/games/`에서 지우고 `ab.json`의 `discarded`에 이름·재료만 남긴다.
 * 졸업한 게임은 스튜디오(`studio/<게임>/`)가 이어받는다(원본 `games/guardian2.ts`·`sheepdog.ts`·`balloonpop.ts`·`duckbath.ts`는 스튜디오 참고용으로 파일만 남김).
 */
import type { Bot, GameDef } from './core.ts';
import { ufo, ufoRandom, ufoSmart } from './games/ufo.ts';
import { robovac, robovacRandom, robovacSmart } from './games/robovac.ts';
import { snowroll, snowrollRandom, snowrollSmart } from './games/snowroll.ts';
import { pillowfight, pillowfightRandom, pillowfightSmart } from './games/pillowfight.ts';
import { sunmirror, sunmirrorRandom, sunmirrorSmart } from './games/sunmirror.ts';
import { railswitch, railswitchRandom, railswitchSmart } from './games/railswitch.ts';

export interface Entry<S = any> { game: GameDef<S>; dumb: Bot<S>; smart: Bot<S> }

export const GAMES: Entry[] = [
  // 24라운드 — 새 장르 6개 (오너: 공장은 계속 돈다)
  { game: ufo, dumb: ufoRandom, smart: ufoSmart },
  { game: robovac, dumb: robovacRandom, smart: robovacSmart },
  { game: snowroll, dumb: snowrollRandom, smart: snowrollSmart },
  { game: pillowfight, dumb: pillowfightRandom, smart: pillowfightSmart },
  { game: sunmirror, dumb: sunmirrorRandom, smart: sunmirrorSmart },
  { game: railswitch, dumb: railswitchRandom, smart: railswitchSmart },
];
