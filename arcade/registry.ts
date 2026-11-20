/**
 * 공장이 만든 게임 목록 — **지금 오너 앞에 있는 게임만** 둔다.
 * 오너(2026-11-07): "선택 받지 못한 아이디어는 폐기해서 보여주지마. 다음 라운드 후보가 너무 많다."
 * → 라운드에서 진 게임은 여기와 `arcade/games/`에서 지우고 `ab.json`의 `discarded`에 이름·재료만 남긴다.
 * 졸업한 게임은 스튜디오(`studio/<게임>/`)가 이어받는다(원본 `games/guardian2.ts`·`sheepdog.ts`·`balloonpop.ts`·`duckbath.ts`·`screwshop.ts`·`animalbus.ts`·`demolition.ts`·`potionsort.ts`·`slowdash.ts`·`petsquad.ts`는 스튜디오 참고용으로 파일만 남김).
 */
import type { Bot, GameDef } from './core.ts';
import { pengwalk, pengwalkRandom, pengwalkSmart, pengwalkHabit, pengwalkHabit2 } from './games/pengwalk.ts';
import { lavawall, lavawallRandom, lavawallSmart, lavawallHabit, lavawallHabit2 } from './games/lavawall.ts';
import { circustramp, circustrampRandom, circustrampSmart, circustrampHabit, circustrampHabit2 } from './games/circustramp.ts';
import { fishloop, fishloopRandom, fishloopSmart, fishloopHabit, fishloopHabit2 } from './games/fishloop.ts';
import { sporebloom, sporebloomRandom, sporebloomSmart, sporebloomHabit, sporebloomHabit2 } from './games/sporebloom.ts';
import { raingarden, raingardenRandom, raingardenSmart, raingardenHabit, raingardenHabit2 } from './games/raingarden.ts';

/** habits: 늘 같은 버릇대로 하는 봇들(기준 13, 0081 계기판 '버릇 격차') */
export interface Entry<S = any> { game: GameDef<S>; dumb: Bot<S>; smart: Bot<S>; habits?: Bot<S>[] }

export const GAMES: Entry[] = [
  // 37라운드(2026-11-20): 살아 움직이는 세계 6개 — 톡 또는 한 번 긋기로 끼어들기
  { game: pengwalk, dumb: pengwalkRandom, smart: pengwalkSmart, habits: [pengwalkHabit, pengwalkHabit2] },
  { game: lavawall, dumb: lavawallRandom, smart: lavawallSmart, habits: [lavawallHabit, lavawallHabit2] },
  { game: circustramp, dumb: circustrampRandom, smart: circustrampSmart, habits: [circustrampHabit, circustrampHabit2] },
  { game: fishloop, dumb: fishloopRandom, smart: fishloopSmart, habits: [fishloopHabit, fishloopHabit2] },
  { game: sporebloom, dumb: sporebloomRandom, smart: sporebloomSmart, habits: [sporebloomHabit, sporebloomHabit2] },
  { game: raingarden, dumb: raingardenRandom, smart: raingardenSmart, habits: [raingardenHabit, raingardenHabit2] },
];
