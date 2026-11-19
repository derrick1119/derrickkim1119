/**
 * 공장이 만든 게임 목록 — **지금 오너 앞에 있는 게임만** 둔다.
 * 오너(2026-11-07): "선택 받지 못한 아이디어는 폐기해서 보여주지마. 다음 라운드 후보가 너무 많다."
 * → 라운드에서 진 게임은 여기와 `arcade/games/`에서 지우고 `ab.json`의 `discarded`에 이름·재료만 남긴다.
 * 졸업한 게임은 스튜디오(`studio/<게임>/`)가 이어받는다(원본 `games/guardian2.ts`·`sheepdog.ts`·`balloonpop.ts`·`duckbath.ts`·`screwshop.ts`·`animalbus.ts`·`demolition.ts`·`potionsort.ts`·`slowdash.ts`는 스튜디오 참고용으로 파일만 남김).
 */
import type { Bot, GameDef } from './core.ts';
import { ricopeng, ricopengRandom, ricopengSmart, ricopengHabit, ricopengHabit2 } from './games/ricopeng.ts';
import { hookpirate, hookpirateRandom, hookpirateSmart, hookpirateHabit, hookpirateHabit2 } from './games/hookpirate.ts';
import { topspin, topspinRandom, topspinSmart, topspinHabit, topspinHabit2 } from './games/topspin.ts';
import { stompdino, stompdinoRandom, stompdinoSmart, stompdinoHabit, stompdinoHabit2 } from './games/stompdino.ts';
import { iceslide, iceslideRandom, iceslideSmart, iceslideHabit, iceslideHabit2 } from './games/iceslide.ts';
import { axeback, axebackRandom, axebackSmart, axebackHabit, axebackHabit2 } from './games/axeback.ts';

/** habits: 늘 같은 버릇대로 하는 봇들(기준 13, 0081 계기판 '버릇 격차') */
export interface Entry<S = any> { game: GameDef<S>; dumb: Bot<S>; smart: Bot<S>; habits?: Bot<S>[] }

export const GAMES: Entry[] = [
  // 32라운드(2026-11-19): 실시간 액션 2탄 6개 — 오너 선택 대기
  { game: ricopeng, dumb: ricopengRandom, smart: ricopengSmart, habits: [ricopengHabit, ricopengHabit2] },
  { game: hookpirate, dumb: hookpirateRandom, smart: hookpirateSmart, habits: [hookpirateHabit, hookpirateHabit2] },
  { game: topspin, dumb: topspinRandom, smart: topspinSmart, habits: [topspinHabit, topspinHabit2] },
  { game: stompdino, dumb: stompdinoRandom, smart: stompdinoSmart, habits: [stompdinoHabit, stompdinoHabit2] },
  { game: iceslide, dumb: iceslideRandom, smart: iceslideSmart, habits: [iceslideHabit, iceslideHabit2] },
  { game: axeback, dumb: axebackRandom, smart: axebackSmart, habits: [axebackHabit, axebackHabit2] },
];
