/**
 * 공장이 만든 게임 목록 — **지금 오너 앞에 있는 게임만** 둔다.
 * 오너(2026-11-07): "선택 받지 못한 아이디어는 폐기해서 보여주지마. 다음 라운드 후보가 너무 많다."
 * → 라운드에서 진 게임은 여기와 `arcade/games/`에서 지우고 `ab.json`의 `discarded`에 이름·재료만 남긴다.
 * 졸업한 게임은 스튜디오(`studio/<게임>/`)가 이어받는다(원본 `games/guardian2.ts`·`sheepdog.ts`·`balloonpop.ts`·`duckbath.ts`·`screwshop.ts`·`animalbus.ts`·`demolition.ts`·`potionsort.ts`·`slowdash.ts`는 스튜디오 참고용으로 파일만 남김).
 */
import type { Bot, GameDef } from './core.ts';
import { shadowghost, shadowghostRandom, shadowghostSmart, shadowghostHabit, shadowghostHabit2 } from './games/shadowghost.ts';
import { puffhamster, puffhamsterRandom, puffhamsterSmart, puffhamsterHabit, puffhamsterHabit2 } from './games/puffhamster.ts';
import { froglily, froglilyRandom, froglilySmart, froglilyHabit, froglilyHabit2 } from './games/froglily.ts';
import { umbrellaparry, umbrellaparryRandom, umbrellaparrySmart, umbrellaparryHabit, umbrellaparryHabit2 } from './games/umbrellaparry.ts';
import { chameleon, chameleonRandom, chameleonSmart, chameleonHabit, chameleonHabit2 } from './games/chameleon.ts';
import { wavesurf, wavesurfRandom, wavesurfSmart, wavesurfHabit, wavesurfHabit2 } from './games/wavesurf.ts';

/** habits: 늘 같은 버릇대로 하는 봇들(기준 13, 0081 계기판 '버릇 격차') */
export interface Entry<S = any> { game: GameDef<S>; dumb: Bot<S>; smart: Bot<S>; habits?: Bot<S>[] }

export const GAMES: Entry[] = [
  // 33라운드(2026-11-19): 서로 다른 뼈대 6개 — 오너 선택 대기
  { game: shadowghost, dumb: shadowghostRandom, smart: shadowghostSmart, habits: [shadowghostHabit, shadowghostHabit2] },
  { game: puffhamster, dumb: puffhamsterRandom, smart: puffhamsterSmart, habits: [puffhamsterHabit, puffhamsterHabit2] },
  { game: froglily, dumb: froglilyRandom, smart: froglilySmart, habits: [froglilyHabit, froglilyHabit2] },
  { game: umbrellaparry, dumb: umbrellaparryRandom, smart: umbrellaparrySmart, habits: [umbrellaparryHabit, umbrellaparryHabit2] },
  { game: chameleon, dumb: chameleonRandom, smart: chameleonSmart, habits: [chameleonHabit, chameleonHabit2] },
  { game: wavesurf, dumb: wavesurfRandom, smart: wavesurfSmart, habits: [wavesurfHabit, wavesurfHabit2] },
];
