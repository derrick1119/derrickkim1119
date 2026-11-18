/**
 * 공장이 만든 게임 목록 — **지금 오너 앞에 있는 게임만** 둔다.
 * 오너(2026-11-07): "선택 받지 못한 아이디어는 폐기해서 보여주지마. 다음 라운드 후보가 너무 많다."
 * → 라운드에서 진 게임은 여기와 `arcade/games/`에서 지우고 `ab.json`의 `discarded`에 이름·재료만 남긴다.
 * 졸업한 게임은 스튜디오(`studio/<게임>/`)가 이어받는다(원본 `games/guardian2.ts`·`sheepdog.ts`·`balloonpop.ts`·`duckbath.ts`·`screwshop.ts`·`animalbus.ts`·`demolition.ts`·`potionsort.ts`는 스튜디오 참고용으로 파일만 남김).
 */
import type { Bot, GameDef } from './core.ts';
import { dicecastle, dicecastleRandom, dicecastleSmart } from './games/dicecastle.ts';
import { slotgate, slotgateRandom, slotgateSmart } from './games/slotgate.ts';
import { cardknight, cardknightRandom, cardknightSmart } from './games/cardknight.ts';
import { cloudladder, cloudladderRandom, cloudladderSmart } from './games/cloudladder.ts';
import { coinfall, coinfallRandom, coinfallSmart } from './games/coinfall.ts';
import { rolldice, rolldiceRandom, rolldiceSmart } from './games/rolldice.ts';

export interface Entry<S = any> { game: GameDef<S>; dumb: Bot<S>; smart: Bot<S> }

export const GAMES: Entry[] = [
  // 30라운드(2026-11-18): 카지노·주사위 디펜스 6개 (오너 재료 지시)
  { game: dicecastle, dumb: dicecastleRandom, smart: dicecastleSmart },
  { game: slotgate, dumb: slotgateRandom, smart: slotgateSmart },
  { game: cardknight, dumb: cardknightRandom, smart: cardknightSmart },
  { game: cloudladder, dumb: cloudladderRandom, smart: cloudladderSmart },
  { game: coinfall, dumb: coinfallRandom, smart: coinfallSmart },
  { game: rolldice, dumb: rolldiceRandom, smart: rolldiceSmart },
];
