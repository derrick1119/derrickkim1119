/**
 * 싸움 붙이기 (40라운드: 생각 부담 없는 실시간 전투 · 성장 · 구경) — 싸움 붙이기 × 연쇄 × 도감.
 * 손이 하는 일은 톡 하나: 장터 몬스터를 톡 = 그놈이 무리 가운데 쪽 옆 놈 뒤통수를 '딱!' → 둘이 만화 싸움 구름이 된다.
 *   싸움이 나면 둘레 놈들이 1초 안에 구경하러 몰려와 '오오~' — 구름은 구경꾼을 '뽁 뽁 뽁' 삼키고(삼킬수록 커진다), 다 삼키면 가장 가까운 깨어 있는 놈 쪽으로
 *   어슬렁 굴러가다 걷힌다. 걷히면 안의 놈들이 전부 기절해 튕겨 나오고, 튕겨 나온 놈에 깔린 놈은 화나서 또 싸움(연쇄 ×3까지).
 *   기다릴 일이 없다: 톡은 언제든 되고(쉼 0.5초), 한 무리 안에서는 누구를 톡 해도 같은 결과(구름은 무리 가운데에 생긴다).
 * 뒤집힘: 나는 못 싸운다. 꼬마 여우는 길 끝 꿀단지까지 저절로 살금살금 걷고(구름이 앞서 굴러가면 종종걸음으로 따라간다), 깨어 있는 몬스터 앞에선 덤불 뒤에 숨어 킥킥댄다.
 * 솜씨(정답은 없다): 구름 위 숫자 = '톡 한 번으로 휘말린 수'. 무리는 처음 건드린 톡의 몫이라, 또 톡 한 무리는 새 톡의 작은 숫자가 된다(구름끼리는 달려들어 합체하고 큰 숫자가 이어진다).
 *   그래서 톡을 아끼고 '저절로 번지게' 할수록 숫자가 커진다 — 바짝 붙은 두 무리는 한 구름이 넘어가고, 떨어진 무리는 특별한 놈이 옮겨 준다:
 *   덩치 곰(구름을 다음 무리까지 밀고 간다) · 토끼(앞 무리로 달아나 쿵! 거기서 또 싸움) · 멧돼지(구름이 깨우면 돌진) · 쌍둥이(짝꿍도 제 무리에서 딱!) · 폭죽 장수(세 갈래) · 병아리(멀리서 달려온다) · 마법사(회오리).
 * 동전: 한 번 톡에 k번째로 기절한 놈은 동전 k×k개. 한 번 톡에 5·7·9·12·16·20·24마리가 휘말리면 '와' 띠가 뜨고 그 톡의 동전이 2·3·5·8·12·18·25배.
 *   한 번 톡이 두 무리·세 무리·다섯 무리에 걸치면 '두 무리가 한 구름!' … '길 전체 한 구름!' 띠.
 * 들킴: 판 처음 10초는 아무도 여우를 못 본다. 오래 숨어만 있으면 여우 머리 위 눈금이 차고, 2장부터는 순찰 도깨비가 여우 쪽으로 걸어오며
 *   제 머리 위 눈금을 채운다. 꽉 차면 '!' — 2초 안에 그놈을 톡 못 하면 꿀밤(하트 -1, 머리에 혹, 뒤로 통통). 하트 셋을 다 잃으면 끝.
 * 판 12개(장 3 × 판 4, 장마다 마지막은 대장): 판마다 무리 아홉이 길을 따라 이어지고(대장 판은 여섯 + 대장), 판마다 새 싸움꾼 하나.
 *   1 꼬마 도깨비 → 2 덩치 곰 → 3 겁쟁이 토끼 → 4 대장 왕도깨비(한 방 다섯은 돼야 꿀꺽 — 작은 구름은 걷어찬다)
 *   → 5 낮잠 멧돼지 + 순찰 도깨비 → 6 쌍둥이 → 7 폭죽 장수 → 8 대장 두꺼비 장군(일곱)
 *   → 9 호루라기 올빼미(보는 원 안의 구름을 '삐익!' 걷어 버린다 — 올빼미부터 톡) → 10 구경꾼 병아리 → 11 회오리 마법사 → 12 대장 용 임금(아홉).
 * 성장: 판을 깨면 장난 레벨이 저절로 오른다(구름 처음 크기 · 굴러가는 거리 · 여우 차림: 목도리 → 복면 → 왕관). 장 끝에는 세상 속 큰 물건 둘 중 하나를 톡
 *   (뿅망치 = 딱! 옆의 둘에게, 처음부터 큰 구름 / 고춧가루 = 구름이 더 멀리 굴러간다 · 벌집 = 걷힐 때 벌이 한 놈을 쏜다 / 확성기 = 더 멀리서도 구경하러 온다). 도감 = 싸움 붙여 본 몬스터.
 * 별(쉬운 말 셋): 꿀단지까지 가기 · 꿀밤 안 맞기 · 톡 한 번에 N마리.
 * 웃음: 맞은 놈의 '어쭈?' 얼굴, '오오~' 구경하다 휘말리는 구경꾼, 구름 밖으로 튀어나오는 주먹·발·별과 뱅글 눈 얼굴, 빙글빙글 날아가는 기절, 덤불 뒤에서 킥킥대는 여우.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.52;
const TAU = Math.PI * 2;
/** 몬스터가 다니는 길(발 자리 y) · 여우가 살금살금 가는 앞줄 · 지평선 */
const MY0 = 0.72, MY1 = 1.12, FOX_Y = 1.225, HZ = 0.6;
/** 여우: 걷기 · 길이 뚫렸을 때 달리기 · 깨어 있는 놈 앞에서 멈추는 거리 · 달리려면 이만큼 비어야 */
const WALK = 0.0034, RUN = 0.0055, SPRINT = 0.009, STOP = 0.22, CLEAR = 0.7, CHASE = 0.2, FOX_SX = 0.1;
/** 톡 사이 쉼(틱) · 딱! 멈칫 · 멀리 있으면 달려가서 딱 · 이 안에 있는 놈들이 '한 무리'(구름은 그 가운데에 생긴다) */
const CD = 30, HIT_T = 12, BONK_GAP = 0.03, DASH_V = 0.02, CROWD_R = 0.2;
/** 구름: 처음 반지름 · 처음 수명 · 하나 삼킬 때마다 수명이 이만큼으로 다시 찬다(= 마지막으로 삼킨 뒤 버티는 시간 — 그동안 다음 무리를 톡 하면 합체) · 삼키는 박자(틱) · 생기고 제자리에서 부푸는 틱 */
const R0 = 0.066, LIFE0 = 60, LINGER = 100, BEAR_BOOST = 60, EAT_T = 5, BLOOM = 8, AGE_MAX = 1500;
/** 구름: 구경 온 놈·달아나는 놈을 쫓는 빠르기 · 코앞의 놈을 덮치는 빠르기 · 다음 무리 쪽으로 어슬렁 굴러가는 빠르기(닿을지는 남은 수명에 달렸다) · 다음 놈을 찾는 거리 */
const SEEK_V = 0.0052, POUNCE_V = 0.009, DRIFT_V = 0.0012, SENSE_R = 0.8;
/** 구경꾼: 이 안의 놈들이 구경하러 온다(병아리는 훨씬 멀리서) · 달려오는 빠르기 · 구름 바깥에 서는 틈 */
const GAWK_R = 0.14, GAWK_V = 0.0075, GAWK_GAP = 0.02, GAWK_CHICK = 2.8;
/** 합체: 이 안의 두 구름은 서로 달려든다 · 빠르기 · 달려드는 동안은 수명이 안 준다(최대 틱) */
const LINK_R = 0.68, LINK_V = 0.011, LINK_T = 80;
/** 돌진 구름(멧돼지·쌍둥이) · 폭죽으로 튄 구름 */
const V_CHARGE = 0.021, CHARGE_T = 44, V_ROCKET = 0.019, ROCKET_T = 26;
/** 올빼미: 보는 원 · 호루라기 부는 데 걸리는 틱 · 다시 불기까지 */
const OWL_R = 0.25, OWL_WIND = 28, OWL_REST = 100;
/** 들킴: 판 처음 안전한 시간 · '!' 뒤 꿀밤까지 · 꿀밤 뒤 안전 · 숨어서 기다릴 때 눈금이 차는 틱 수 */
const GRACE = 600, NOTICE_T = 120, SAFE_T = 300;
const PATIENCE = [660, 600, 560, 540];
/** 순찰 도깨비: 걷는 빠르기 · 여우를 보는 거리 · 눈금이 차는 틱 */
const GUARD_V = 0.0022, SIGHT = 0.5, WATCH_T = 190;
const KO_T = 84, FLEE_T = 64, FLEE_V = 0.0125, FLEE_COOL = 70;
const RESULT_MIN = 90, RESULT_OK = 250, RESULT_FAIL = 170, PICK_MIN = 36, PICK_AUTO = 900;
const STAR_PTS = 500, CLEAR_PTS = 200, BOSS_PTS = 2000, WIN_PTS = 3000;
/** '와' 띠가 뜨는 한 번 톡의 휘말린 수 */
const WOW_AT = [5, 7, 9, 12, 16, 20, 24];
/** 띠가 뜬 톡의 동전 배수 (큰 한 방일수록 훨씬 크게) */
const WOW_MUL = [2, 3, 5, 8, 12, 18, 25];
const WOW_TEXT = ['우당탕!', '대소동!', '난장판!', '온 동네 싸움!', '장터가 뒤집혔다!', '전설의 한 방!', '하늘이 놀랐다!'];
/** 한 번 톡이 여러 무리에 걸쳤을 때의 띠 (둘 · 셋 · 다섯 이상) */
const LINK_TEXT = ['두 무리가 한 구름!', '세 무리가 한 구름!', '길 전체 한 구름!'];
const LINK_AT = [2, 3, 5];

type K = 'gob' | 'bear' | 'rabbit' | 'boar' | 'twin' | 'cracker' | 'owl' | 'chick' | 'wiz' | 'boss' | 'guard';
const KINDS: K[] = ['gob', 'bear', 'rabbit', 'boss', 'boar', 'twin', 'cracker', 'owl', 'chick', 'wiz', 'guard'];
const KR: Record<K, number> = { gob: 0.04, bear: 0.062, rabbit: 0.037, boar: 0.052, twin: 0.039, cracker: 0.043, owl: 0.043, chick: 0.034, wiz: 0.045, boss: 0.105, guard: 0.042 };
const KSPD: Record<K, number> = { gob: 0.0024, bear: 0, rabbit: 0.003, boar: 0, twin: 0.0024, cracker: 0.0022, owl: 0, chick: 0.0034, wiz: 0, boss: 0, guard: GUARD_V };
const KNAME: Record<K, string> = { gob: '꼬마 도깨비', bear: '덩치 곰', rabbit: '겁쟁이 토끼', boar: '낮잠 멧돼지', twin: '쌍둥이', cracker: '폭죽 장수', owl: '호루라기 올빼미', chick: '구경꾼 병아리', wiz: '회오리 마법사', boss: '대장', guard: '순찰 도깨비' };
const CH: Record<string, K> = { g: 'gob', B: 'bear', r: 'rabbit', b: 'boar', t: 'twin', c: 'cracker', o: 'owl', k: 'chick', w: 'wiz' };
/** 특별한 놈(톡 하면 판이 달라지는 놈): 손가락이 조금 빗나가도 잡히게 판정이 크다 */
const SPECIAL: Partial<Record<K, number>> = { bear: 0.065, boar: 0.065, owl: 0.065, wiz: 0.065, cracker: 0.06, guard: 0.06 };
/** 몬스터 상태 */
const IDLE = 0, DASH = 1, HIT = 2, INC = 3, FLY = 4, KO = 5, SLEEP = 6, NOTICE = 7, FLEE = 8, DAZE = 9, ENTER = 10;
/** HIT 상태의 역할(tgt): 맞는 쪽 · 깨어나는 멧돼지 · 혼자 넘어지는 놈 */
const T_VICTIM = -2, T_BOAR = -3, T_SOLO = -4;

/** 무리: 0 어슬렁대는 무리 · 2 제자리(멧돼지는 ang 쪽을 본다) */
interface GroupDef { f: 0 | 2; x: number; y: number; m: string; rad?: number; ang?: number }
interface StageDef {
  key: K; ch: number; name: string; news: string; len: number; need: number; g: GroupDef[];
  /** 순찰 도깨비가 나오는 여우 자리(x)들 — 2장부터 */
  guards?: number[];
  boss?: { need: number; pool: string; name: string };
}
const G = (x: number, y: number, m: string, rad = 0.1): GroupDef => ({ f: 0, x, y, m, rad });
const ST = (x: number, y: number, m: string, ang = 0): GroupDef => ({ f: 2, x, y, m, ang });

/**
 * 판 12개 (좌표는 화면 폭 = 1, 길이는 화면 몇 개). 무리 아홉(대장 판은 여섯)이 길을 따라 이어진다 — 바짝 붙은 두 무리(0.32)는 한 구름이 저절로 넘어가고,
 * 떨어진 무리(0.5)는 구름이 살아 있을 때 톡으로 다리를 놓거나 특별한 놈이 옮겨 준다. 마지막은 큰 무리나 대장. 판마다(다시 할 때도) 시드로 위아래를 뒤집고 살짝 흔든다
 */
export const STAGES: StageDef[] = [
  {
    key: 'gob', ch: 0, name: '장터 입구', news: '', len: 3.4, need: 8,
    g: [G(0.56, 0.93, 'ggggg', 0.07), ST(0.84, 0.765, 'gg'), G(1.08, 0.88, 'gggg'), G(1.58, 1.0, 'gggg'), G(1.9, 0.86, 'gggg'), G(2.4, 1.0, 'gggg'), G(2.74, 0.9, 'gggggg', 0.11)],
  },
  {
    key: 'bear', ch: 0, name: '떡집 골목', news: '덩치 곰 — 구름을 옆 무리까지 밀고 가요', len: 4.7, need: 14,
    g: [G(0.56, 0.92, 'Bggg'), G(0.88, 0.84, 'gggg'), G(1.38, 1.0, 'gggg'), G(1.88, 0.88, 'Bggg'), G(2.2, 1.02, 'gggg'), G(2.7, 0.86, 'gggg'), G(3.2, 1.0, 'gggg'), G(3.52, 0.86, 'Bggg'), G(4.02, 0.94, 'gggggg', 0.11)],
  },
  {
    key: 'rabbit', ch: 0, name: '당근 가게 앞', news: '겁쟁이 토끼 — 앞 무리로 달아나다 쿵! 또 싸움', len: 4.7, need: 14,
    g: [G(0.56, 0.92, 'gggr'), G(0.88, 0.84, 'gggg'), G(1.38, 1.0, 'Bggr'), G(1.88, 0.88, 'gggg'), G(2.2, 1.02, 'ggrr'), G(2.7, 0.86, 'gggg'), G(3.2, 1.0, 'gggr'), G(3.52, 0.86, 'gggg'), G(4.02, 0.94, 'gggggrr', 0.11)],
  },
  {
    key: 'boss', ch: 0, name: '왕도깨비 잔칫상', news: '대장 — 한 방 다섯은 돼야 꿀꺽', len: 3.66, need: 14,
    g: [G(0.56, 0.92, 'gggr'), G(0.88, 0.84, 'Bggg'), G(1.38, 1.0, 'gggg'), G(1.88, 0.88, 'gggr'), G(2.2, 1.02, 'gggg'), G(2.66, 0.94, 'ggggg', 0.11)],
    boss: { need: 5, pool: 'gggrgB', name: '왕도깨비' },
  },
  {
    key: 'boar', ch: 1, name: '숲길 들머리', news: '낮잠 멧돼지 — 깨우면 앞으로 돌진!', len: 5.25, need: 16, guards: [1.4, 3.4],
    g: [ST(0.5, 0.92, 'b', 0), G(0.86, 0.92, 'gggg'), G(1.18, 0.84, 'gggg'), G(1.68, 1.0, 'gggg'), ST(1.86, 1.0, 'b', 0), G(2.24, 1.0, 'gggg'), G(2.56, 0.86, 'Bggg'), G(3.06, 1.0, 'gggg'), G(3.56, 0.86, 'gggg'), ST(3.74, 0.86, 'b', 0), G(4.12, 0.9, 'gggg'), G(4.6, 0.94, 'gggggg', 0.11)],
  },
  {
    key: 'twin', ch: 1, name: '버섯 다리', news: '쌍둥이 — 짝꿍이 휘말리면 저도 옆 놈을 딱!', len: 4.7, need: 14, guards: [1.4, 3.4],
    g: [G(0.56, 0.92, 'tggg'), G(0.88, 0.84, 'gggg'), G(1.38, 1.0, 'tggg'), G(1.88, 0.88, 'gggr'), G(2.2, 1.02, 'tggg'), G(2.7, 0.86, 'tggg'), G(3.2, 1.0, 'Bggg'), G(3.52, 0.86, 'tggg'), G(4.02, 0.94, 'tggggg', 0.11)],
  },
  {
    key: 'cracker', ch: 1, name: '불꽃놀이 공터', news: '폭죽 장수 — 휘말리면 구름이 세 갈래로 펑!', len: 4.7, need: 14, guards: [1.4, 3.4],
    g: [G(0.56, 0.92, 'cggg'), G(0.88, 0.84, 'gggg'), G(1.38, 1.0, 'gggg'), G(1.88, 0.88, 'cggg'), G(2.2, 1.02, 'tggg'), G(2.7, 0.86, 'tBgg'), G(3.2, 1.0, 'gggg'), G(3.52, 0.86, 'cggg'), G(4.02, 0.94, 'gggggg', 0.11)],
  },
  {
    key: 'boss', ch: 1, name: '두꺼비 장군 진지', news: '대장 — 한 방 일곱은 돼야 꿀꺽', len: 3.74, need: 18, guards: [1.2, 2.4],
    g: [G(0.56, 0.92, 'cggg'), G(0.88, 0.84, 'tggg'), G(1.38, 1.0, 'tggg'), ST(1.7, 0.88, 'b', 0), G(1.96, 0.88, 'gggg'), G(2.28, 1.02, 'gggr'), G(2.74, 0.94, 'ggggg', 0.11)],
    boss: { need: 7, pool: 'ggggrBgc', name: '두꺼비 장군' },
  },
  {
    key: 'owl', ch: 2, name: '바닷가 산책길', news: '올빼미 — 삐익! 구름을 걷어요. 올빼미부터 톡!', len: 4.7, need: 16, guards: [1.4, 3.4],
    g: [G(0.56, 0.92, 'oggg'), G(0.88, 0.84, 'gggg'), G(1.38, 1.0, 'gggg'), G(1.88, 0.88, 'oBgg'), G(2.2, 1.02, 'cggg'), G(2.7, 0.86, 'gggg'), G(3.2, 1.0, 'ogggr'), G(3.52, 0.86, 'gggg'), G(4.02, 0.94, 'gggggg', 0.11)],
  },
  {
    key: 'chick', ch: 2, name: '솜사탕 부두', news: '병아리 — 멀리서도 싸움 구경하러 달려와요', len: 4.7, need: 20, guards: [1.4, 3.4],
    g: [G(0.56, 0.92, 'gggk'), G(0.88, 0.84, 'kkkk'), G(1.38, 1.0, 'oggk'), G(1.88, 0.88, 'kkgg'), G(2.2, 1.02, 'cggk'), G(2.7, 0.86, 'gggk'), G(3.2, 1.0, 'kkkk'), G(3.52, 0.86, 'oggk'), G(4.02, 0.94, 'gggkkk', 0.11)],
  },
  {
    key: 'wiz', ch: 2, name: '등대 광장', news: '마법사 — 휘말리면 구름이 회오리가 돼요', len: 4.7, need: 18, guards: [1.4, 3.4],
    g: [G(0.56, 0.92, 'wggg'), G(0.88, 0.84, 'ggrr'), G(1.38, 1.0, 'woggk'), G(1.88, 0.88, 'tggg'), G(2.2, 1.02, 'tggk'), G(2.7, 0.86, 'gggk'), G(3.2, 1.0, 'wggg'), G(3.52, 0.86, 'Bggk'), G(4.02, 0.94, 'wgkkkk', 0.11)],
  },
  {
    key: 'boss', ch: 2, name: '용 임금 꿀 창고', news: '대장 — 한 방 아홉은 돼야 꿀꺽', len: 3.66, need: 16, guards: [1.2, 2.4],
    g: [G(0.56, 0.92, 'wgggk'), G(0.88, 0.84, 'cggk'), G(1.38, 1.0, 'tggg'), G(1.88, 0.88, 'tggk'), G(2.2, 1.02, 'gggk'), G(2.66, 0.94, 'ggggk', 0.11)],
    boss: { need: 9, pool: 'ggkgrkgBgc', name: '용 임금' },
  },
];
export const STAGE_COUNT = STAGES.length;
const CHAPTER = ['도깨비 장터', '버섯 숲길', '바닷가 축제'];
/** 장 끝 둘 중 하나: [왼쪽, 오른쪽] */
const PICKS = [
  [{ key: 'hammer', name: '뿅망치', line: '처음부터 큰 구름으로 딱!' }, { key: 'pepper', name: '고춧가루', line: '구름이 더 멀리 굴러가요' }],
  [{ key: 'hive', name: '벌집', line: '걷힐 때 벌이 한 놈을 쏴요' }, { key: 'horn', name: '확성기', line: '멀리서도 구경 와요' }],
];

interface Group { x: number; y: number; form: number; rad: number; ang: number; m: string; born: boolean }
interface Mon {
  id: number; k: K; x: number; y: number; r: number; st: number; tm: number;
  g: number; a: number; f: number; dir: number; still: boolean; hx: number; hy: number;
  vx: number; vy: number; z: number; vz: number; face: number; ang: number;
  cid: number; tap: number; chain: number; tgt: number; tgt2: number; pair: number; dx: number; dy: number; px: number; py: number;
  /** cool: 토끼가 다시 달아나기까지 · wind: 올빼미 호루라기/순찰 눈금 · gk: 구경하는 구름 id(-1 = 구경 안 함) */
  cool: number; wind: number; gk: number;
  // 연출 (결과와 무관)
  v: number; seed: number; hitT: number; walk: boolean; sky: boolean;
}
interface Cloud {
  id: number; x: number; y: number; vx: number; vy: number; r: number; life: number; age: number; n: number; w: number;
  tap: number; chain: number; kind: number; kick: number; tor: number; split: number; nomerge: number; mega: number; eat: number; rush: number; dead: boolean;
  /** taps: 이 구름에 합쳐진 톡들 · boost: 덩치가 밀어 주는 틱(다음 무리까지 데굴데굴) · bu: 밀기 시작했나 */
  taps: number[]; boost: number; bu: number;
  // 연출
  seed: number; popT: number; cols: number[];
}
interface Ev { t: number; kind: string; x: number; y: number; n?: number; text?: string }

export interface BrawlState {
  rng: Rng; seed: number; t: number; st: number; stage: number; phase: 'play' | 'result' | 'pick'; pt: number; ok: boolean; lite: boolean;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; won: boolean; dead: boolean;
  level: number; perkA: number; perkB: number;
  L: number; potX: number; cam: number; flip: boolean;
  fx: number; kb: number; blocked: boolean; blockT: number; run: boolean; alert: number; noticer: number; safeT: number; cloudWait: boolean;
  /** gt: 무리마다 '처음 건드린 톡'(그 톡의 싸움이 이어지는 동안 그 무리는 그 톡의 몫) */
  mons: Mon[]; clouds: Cloud[]; groups: Group[]; gt: number[]; nid: number; twinOpen: number; guardN: number;
  bossId: number; bossNeed: number; bossGone: boolean; bossT: number; kicks: number;
  down: boolean; cd: number; taps: number; stageTaps: number; tapN: number;
  /** 톡마다(16칸 돌려 쓰기): 휘말린 수 · 기절한 수 · 뜬 '와' 띠 수 · 걸친 무리 수 */
  tc: number[]; tk: number[]; tw: number[]; tl: number[];
  bestTap: number; hits: number; notices: number; kos: number; chainMax: number; wowN: number; firstTap: number; firstWow: number;
  dex: Record<string, number>; seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; spot: { k: K; t: number } | null;
  events: Ev[];
  // 연출용
  lastBurstT: number; pickSel: number; lvT: number;
}

const ev = (s: BrawlState, kind: string, x: number, y: number, n?: number, text?: string) => {
  if (!s.lite) s.events.push({ t: s.t, kind, x, y, n, text });
};
function see(s: BrawlState, key: string, text = '') {
  if (s.lite || !key || s.seen.has(key)) return;
  s.seen.add(key);
  if (text) s.newsQ.push(text);
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const jit = (r: Rng, a: number) => (r() - 0.5) * 2 * a;

// ───────────────────────────── 시뮬레이션 ─────────────────────────────
const isStill = (k: K) => k === 'bear' || k === 'boar' || k === 'owl' || k === 'wiz' || k === 'cracker' || k === 'boss';
/** 깨어서 길 위에 있는 놈(여우 길을 막는다) */
const blocks = (m: Mon) => m.st === IDLE || m.st === NOTICE || m.st === DAZE || m.st === ENTER || m.st === DASH || m.st === FLEE || m.st === HIT;
/** 톡 할 수 있는 놈 */
const tappable = (m: Mon) => (m.st === IDLE || m.st === NOTICE || m.st === SLEEP || m.st === DAZE) && m.k !== 'boss';
/** 싸움 상대가 될 수 있는 놈 */
const canFight = (m: Mon) => (m.st === IDLE || m.st === NOTICE || m.st === DAZE || m.st === ENTER) && m.k !== 'boss';
/** 구름이 삼킬 수 있는 놈 */
const edible = (m: Mon) => m.st === IDLE || m.st === NOTICE || m.st === DAZE || m.st === ENTER || m.st === DASH || m.st === FLEE || m.st === SLEEP;

function mk(s: BrawlState, k: K, x: number, y: number, g: number): Mon {
  const m: Mon = {
    id: ++s.nid, k, x, y, r: KR[k], st: k === 'boar' ? SLEEP : IDLE, tm: 0, g, a: 0, f: 1, dir: 1, still: isStill(k), hx: x, hy: y,
    vx: 0, vy: 0, z: 0, vz: 0, face: -1, ang: 0, cid: -1, tap: 0, chain: 0, tgt: -1, tgt2: -1, pair: -1, dx: 1, dy: 0, px: x, py: y,
    cool: 0, wind: 0, gk: -1, v: Math.floor(s.rng() * 3), seed: Math.floor(s.rng() * 1000), hitT: -999, walk: false, sky: false,
  };
  s.mons.push(m);
  return m;
}
const monById = (s: BrawlState, id: number) => {
  for (const m of s.mons) if (m.id === id) return m;
  return null;
};
const cloudById = (s: BrawlState, id: number) => {
  for (const c of s.clouds) if (c.id === id && !c.dead) return c;
  return null;
};

function newStage(s: BrawlState) {
  const d = STAGES[s.stage], r = s.rng;
  s.flip = s.stage > 0 && r() < 0.5;
  const FY = (y: number) => (s.flip ? MY0 + MY1 - y : y);
  s.L = d.len;
  s.potX = d.len - 0.2;
  s.st = 0;
  s.fx = 0.13;
  s.cam = 0.03;
  s.kb = 0;
  s.blocked = false;
  s.blockT = 0;
  s.run = false;
  s.alert *= 0.5;
  s.noticer = -1;
  s.safeT = 0;
  s.cloudWait = false;
  s.mons = [];
  s.clouds = [];
  s.twinOpen = -1;
  s.guardN = 0;
  s.bossId = -1;
  s.bossNeed = 0;
  s.bossGone = false;
  s.bossT = 0;
  s.kicks = 0;
  s.cd = 0;
  s.bestTap = 0;
  s.hits = 0;
  s.stageTaps = 0;
  s.phase = 'play';
  s.pt = 0;
  s.starOk = [false, false, false];
  s.groups = d.g.map((gd) => ({
    x: gd.x + (s.stage > 0 && gd.f === 0 ? jit(r, 0.03) : 0), y: clamp(FY(gd.y) + (s.stage > 0 && gd.f === 0 ? jit(r, 0.02) : 0), MY0 + 0.04, MY1 - 0.04),
    form: gd.f, rad: gd.rad ?? 0.1, ang: s.flip ? -(gd.ang ?? 0) : gd.ang ?? 0, m: gd.m, born: false,
  }));
  s.gt = s.groups.map(() => 0);
  if (d.boss) {
    const b = mk(s, 'boss', d.len - 0.62, (MY0 + MY1) / 2, -1);
    b.hx = b.x;
    b.hy = b.y;
    s.bossId = b.id;
    s.bossNeed = d.boss.need;
    see(s, 'boss' + d.ch, `${d.boss.name} — 작은 구름은 걷어차요`);
  }
  spawnGroups(s);
  if (!s.lite) {
    see(s, d.key === 'boss' ? '' : d.key);
    s.newsQ = d.news ? [d.news] : [];
    s.news = null;
    s.spot = s.stage > 0 ? { k: d.key, t: s.t } : null;
  }
}
/** 화면에 보이는 놈 수 (구름 속에 든 놈은 구름 하나로 보인다) */
const MAX_SHOWN = 24;
function shownN(s: BrawlState) {
  let n = 0;
  for (const m of s.mons) if (m.st !== INC && m.st !== -1) n++;
  return n;
}
/** 길 앞쪽 무리는 여우가 다가가면 생긴다 (보이는 놈이 한 번에 24마리를 넘지 않게) */
function spawnGroups(s: BrawlState) {
  // 여우 앞 1.3 또는 가장 앞선 구름 앞 0.8 안의 무리 (구름이 여우보다 앞서 굴러가도 다음 무리가 기다리고 있게)
  let front = s.fx + 1.3;
  for (const c of s.clouds) if (!c.dead && c.x + 0.8 > front) front = c.x + 0.8;
  for (let gi = 0; gi < s.groups.length; gi++) {
    const Gp = s.groups[gi];
    if (Gp.born || Gp.x > front) continue;
    // 보이는 놈이 24마리를 넘지 않게(구름 속에 든 놈은 안 보인다): 기절해 누운 놈부터 사라진다
    let shown = shownN(s), lying = 0;
    for (const m of s.mons) if (m.st === KO) lying++;
    if (shown - lying + Gp.m.length > MAX_SHOWN) continue;
    for (const m of s.mons) if (m.st === KO && shown + Gp.m.length > MAX_SHOWN) (m.st = -1), shown--;
    if (s.mons.some((m) => m.st === -1)) s.mons = s.mons.filter((m) => m.st !== -1);
    Gp.born = true;
    const r = s.rng, ks = [...Gp.m].map((c) => CH[c]), movers = ks.filter((k) => !isStill(k)).length, a0 = r() * TAU;
    let j = 0, sj = 0;
    const n0 = s.mons.length, late: Mon[] = [];
    for (const k of ks) {
      const m = mk(s, k, Gp.x, Gp.y, gi);
      let x = Gp.x, y = Gp.y;
      if (Gp.form === 2) {
        // 제자리: 줄지어 선다 (멧돼지는 ang 쪽을 본다)
        const off = (j - (ks.length - 1) / 2) * 0.075;
        x = Gp.x + off;
        y = Gp.y + (ks.length > 1 ? (j % 2 ? 0.012 : -0.012) : 0);
        j++;
        m.still = true;
        m.ang = Gp.ang;
        m.face = Math.cos(Gp.ang) >= 0 ? 1 : -1;
      } else if (m.still) {
        // 특별한 놈은 무리 옆에 따로 서 있다
        const side = (Math.floor(a0 * 7) + sj) % 2 ? 1 : -1, aa = (side > 0 ? 0 : Math.PI) + (((a0 * 3) % 1) - 0.5) * 0.9, rr = Gp.rad + (k === 'bear' ? 0.085 : 0.06);
        x = Gp.x + Math.cos(aa) * rr;
        y = Gp.y + Math.sin(aa) * rr * 0.6;
        sj++;
      } else {
        m.a = a0 + (TAU * j) / Math.max(1, movers);
        m.f = movers > 3 ? (j % 2 ? 1 : 0.45) : 0.8;
        m.dir = (gi + j) % 3 === 0 ? -1 : 1;
        j++;
        x = Gp.x + Math.cos(m.a) * Gp.rad * m.f;
        y = Gp.y + Math.sin(m.a) * Gp.rad * m.f * 0.62;
      }
      m.x = m.hx = x;
      m.y = m.hy = clamp(y, MY0, MY1);
      if (k === 'twin') {
        const q = s.twinOpen >= 0 ? monById(s, s.twinOpen) : null;
        if (q) (m.pair = q.id), (q.pair = m.id), (m.v = q.v), (s.twinOpen = -1);
        else s.twinOpen = m.id;
        // 짝꿍이 벌써 싸움에 휘말려 있으면 나오자마자 덤빈다
        if (q && q.st === INC && tapAlive(s, q.tap)) late.push(m);
      }
    }
    // 겹침을 푼다
    for (let i = 0; i < 10; i++) separate(s, n0);
    for (let i = n0; i < s.mons.length; i++) if (s.mons[i].still) (s.mons[i].hx = s.mons[i].x), (s.mons[i].hy = s.mons[i].y);
    for (const m of late) {
      const q = monById(s, m.pair);
      if (!q) continue;
      ev(s, 'twin', m.x, m.y);
      provoke(s, m, q.tap, q.chain + 1, -1, 0, false);
    }
  }
}

let GX = 0, GY = 0;
/** 어슬렁: 무리 자리 둘레를 천천히 돈다 */
function goal(s: BrawlState, m: Mon) {
  const Gp = s.groups[m.g];
  if (!Gp || m.still) return void ((GX = m.hx), (GY = m.hy));
  const th = m.a + s.st * 0.0032 * m.dir;
  GX = Gp.x + Math.cos(th) * Gp.rad * m.f;
  GY = Gp.y + Math.sin(th) * Gp.rad * m.f * 0.62;
}

function separate(s: BrawlState, from = 0) {
  const ms = s.mons, n = ms.length;
  for (let i = from; i < n; i++) {
    const a = ms[i];
    if (a.st !== IDLE && a.st !== SLEEP && a.st !== DAZE && a.st !== NOTICE) continue;
    for (let j = i + 1; j < n; j++) {
      const b = ms[j];
      if (b.st !== IDLE && b.st !== SLEEP && b.st !== DAZE && b.st !== NOTICE) continue;
      const dx = b.x - a.x, dy = (b.y - a.y) * 1.6, min = (a.r + b.r) * 1.04;
      const d2 = dx * dx + dy * dy;
      if (d2 >= min * min) continue;
      const d = Math.sqrt(d2) || 0.001, push = (min - d) * 0.5, ux = d2 ? dx / d : 1, uy = d2 ? dy / d : 0;
      const fa = a.still ? 0 : b.still ? 1 : 0.5, fb = b.still ? 0 : a.still ? 1 : 0.5;
      a.x -= ux * push * 2 * fa;
      a.y -= (uy * push * 2 * fa) / 1.6;
      b.x += ux * push * 2 * fb;
      b.y += (uy * push * 2 * fb) / 1.6;
    }
  }
}

function nearestFighter(s: BrawlState, a: Mon): Mon | null {
  let best: Mon | null = null, bd = 1e9;
  for (const m of s.mons) {
    if (m === a || !canFight(m)) continue;
    const d = (m.x - a.x) ** 2 + (m.y - a.y) ** 2;
    if (d < bd) (bd = d), (best = m);
  }
  return best;
}

/** a와 한 무리로 치는 놈인가: 같은 무리의 가까운 놈(무리가 없으면 둘레 CROWD_R 안) */
function crowdOf(a: Mon, m: Mon) {
  if (m === a || !canFight(m)) return false;
  const d2 = (m.x - a.x) ** 2 + (m.y - a.y) ** 2;
  return a.g >= 0 && m.g === a.g ? d2 < 0.3 * 0.3 : d2 < CROWD_R * CROWD_R;
}
/**
 * a가 싸움을 건다. 제 무리가 곁에 있으면 '무리 가운데 쪽 옆 놈'을 때리고 구름은 무리 가운데에 생긴다
 * (한 무리 안에서는 누구를 톡 해도 같은 결과 — 손가락이 조금 빗나가도 된다). 둘레에 아무도 없으면 far일 때만 가장 가까운 놈에게 달려가서, 그것도 없으면 혼자 구름.
 */
function provoke(s: BrawlState, a: Mon, tap: number, chain: number, dx: number, dy: number, far: boolean) {
  if (s.noticer === a.id) s.noticer = -2;
  a.tap = tap;
  a.chain = chain;
  a.gk = -1;
  let cx = a.x, cy = a.y, n = 1;
  for (const m of s.mons) {
    if (!crowdOf(a, m)) continue;
    cx += m.x;
    cy += m.y;
    n++;
  }
  if (n >= 2) {
    cx /= n;
    cy /= n;
    let b: Mon | null = null, bd = 1e9;
    for (const m of s.mons) {
      if (!crowdOf(a, m)) continue;
      const d = (m.x - cx) ** 2 + (m.y - cy) ** 2;
      if (d < bd) (bd = d), (b = m);
    }
    if (b) return startHit(s, a, b, cx, cy);
  }
  const b = far ? nearestFighter(s, a) : null;
  if (b && Math.hypot(b.x - a.x, b.y - a.y) < 1.3) {
    a.st = DASH;
    a.tm = 0;
    a.tgt = b.id;
    ev(s, 'dash', a.x, a.y);
    return;
  }
  // 혼자: 제풀에 화내다 작은 구름
  const l = Math.hypot(dx, dy);
  a.st = HIT;
  a.tm = HIT_T;
  a.tgt = T_SOLO;
  a.dx = l > 1e-6 ? dx / l : 1;
  a.dy = l > 1e-6 ? dy / l : 0;
  a.px = a.x;
  a.py = a.y;
  a.hitT = s.t;
  ev(s, 'solo', a.x, a.y);
}
function startHit(s: BrawlState, a: Mon, b: Mon, px: number, py: number) {
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 0.001;
  a.st = HIT;
  a.tm = HIT_T;
  a.tgt = b.id;
  a.tgt2 = -1;
  a.dx = (b.x - a.x) / d;
  a.dy = (b.y - a.y) / d;
  a.px = px;
  a.py = py;
  a.face = a.dx >= 0 ? 1 : -1;
  a.hitT = s.t;
  a.gk = -1;
  if (s.noticer === b.id) s.noticer = -2;
  b.st = HIT;
  b.tm = HIT_T + 4;
  b.tgt = T_VICTIM;
  b.hitT = s.t;
  b.gk = -1;
  // 뿅망치: 옆의 하나 더
  if (s.perkA === 1) {
    let c: Mon | null = null, cd = CROWD_R ** 2;
    for (const m of s.mons) {
      if (m === a || m === b || !canFight(m)) continue;
      const q = (m.x - px) ** 2 + (m.y - py) ** 2;
      if (q < cd) (cd = q), (c = m);
    }
    if (c) {
      if (s.noticer === c.id) s.noticer = -2;
      c.st = HIT;
      c.tm = HIT_T + 4;
      c.tgt = T_VICTIM;
      c.hitT = s.t;
      c.gk = -1;
      a.tgt2 = c.id;
      ev(s, 'bonk', c.x, c.y, 2);
    }
  }
  ev(s, 'bonk', b.x, b.y, a.chain);
}
function wake(s: BrawlState, m: Mon, tap: number, chain: number) {
  m.st = HIT;
  m.tm = 16;
  m.tgt = T_BOAR;
  m.tap = tap;
  m.chain = chain;
  m.hitT = s.t;
  ev(s, 'wake', m.x, m.y);
}

/** 마지막으로 삼킨 뒤 구름이 버티는 틱 = 다음 무리 쪽으로 굴러가는 거리 (장난 레벨 · 고춧가루로 길어진다) */
const lingerOf = (s: BrawlState) => LINGER * (1 + 0.02 * s.level) * (s.perkA === 2 ? 1.35 : 1);
function radiusOf(s: BrawlState, c: Cloud) {
  const base = R0 * (1 + 0.012 * s.level) + 0.02 * Math.sqrt(Math.max(0, c.n + c.w - 2));
  return c.mega ? Math.min(0.27, base + 0.06) : Math.min(0.2, base) * (c.tor > 0 ? 1.12 : 1);
}
function spawnCloud(s: BrawlState, mem: Mon[], x: number, y: number, dx: number, dy: number, tap: number, chain: number, kind: number, from: Cloud | null = null): Cloud {
  const v = kind === 1 ? V_CHARGE : kind === 2 ? V_ROCKET : mem.length === 1 ? 0.004 : 0;
  const c: Cloud = {
    id: ++s.nid, x: clamp(x, 0.07, s.L - 0.34), y: clamp(y, MY0, MY1), vx: dx * v, vy: dy * v, r: R0, life: (kind === 1 ? CHARGE_T + 10 : kind === 2 ? ROCKET_T + 24 : LIFE0) + s.level, age: 0, n: 0, w: 0,
    tap, chain, kind, kick: 0, tor: 0, split: 0, nomerge: kind === 2 ? 36 : kind === 1 ? CHARGE_T : 0, mega: 0, eat: 0, rush: 0, dead: false, taps: [tap], boost: 0, bu: 0, seed: s.nid * 7, popT: s.t, cols: [],
  };
  s.clouds.push(c);
  if (from) c.taps = from.taps.slice();
  for (const m of mem) swallow(s, c, m, from ? 2 : 1);
  if (s.perkA === 1 && chain === 1 && kind === 0 && !from && mem.length >= 2) c.w += 2; // 뿅망치: 처음부터 큰 구름
  c.r = radiusOf(s, c);
  if (chain > s.chainMax) s.chainMax = chain;
  if (chain >= 2) see(s, 'chain');
  see(s, 'cloud');
  ev(s, 'cloud', c.x, c.y, chain);
  return c;
}
/** mode 0: 굴러가다 삼킴(무리를 처음 건드린 톡의 몫) · 1: 싸움을 건 놈들(그 톡의 몫) · 2: 폭죽으로 갈라진 구름에 옮겨 담기(몫 그대로) */
function swallow(s: BrawlState, c: Cloud, m: Mon, mode = 0) {
  if (s.noticer === m.id) s.noticer = -2;
  const tap = mode === 2 ? m.tap : mode === 1 ? c.tap : creditTap(s, c, m);
  if (mode === 1 && m.g >= 0 && s.groups[m.g] && s.groups[m.g].form === 0 && s.gt[m.g] !== tap && !(s.gt[m.g] && tapAlive(s, s.gt[m.g]))) claim(s, c, m.g, tap);
  m.st = INC;
  m.cid = c.id;
  m.tap = tap;
  m.gk = -1;
  c.n++;
  if (!s.lite && c.cols.length < 8) c.cols.push(KINDS.indexOf(m.k) * 3 + m.v);
  const slot = tap & 15, cnt = mode === 2 ? s.tc[slot] : ++s.tc[slot];
  // 구름의 숫자 = 이 구름에 합쳐진 톡 가운데 가장 큰 것
  if (tap !== c.tap && cnt > s.tc[c.tap & 15] && c.taps.indexOf(tap) >= 0) c.tap = tap;
  if (mode === 0) {
    c.life = Math.max(c.life, lingerOf(s));
    // 새로 낀 놈 쪽으로 구름이 쏠린다
    if (c.kind === 0 && !c.mega) (c.x += (m.x - c.x) / (c.n + 1)), (c.y += (m.y - c.y) / (c.n + 1));
    c.popT = s.t;
    ev(s, 'swallow', m.x, m.y, cnt);
  }
  if (m.k === 'boar') c.w += 1;
  if (m.k === 'bear') (c.w += 2), (c.boost += mode === 2 ? 0 : BEAR_BOOST), see(s, 'bigcloud'); // 덩치가 끼면 구름이 커지고, 다 삼킨 뒤 다음 무리까지 데굴데굴 밀고 간다
  if (m.k === 'cracker' && !c.mega) c.split = 22;
  if (m.k === 'wiz') (c.tor = Math.max(c.tor, 130)), (c.life = Math.max(c.life, 100)), ev(s, 'tornado', c.x, c.y), see(s, 'tornado');
  if (m.k === 'twin' && m.pair >= 0 && mode !== 2) {
    // 쌍둥이: 짝꿍이 휘말리면 멀리 있는 짝꿍도 "내 짝꿍을?!" 하고 제 옆 놈을 딱! — 같은 톡으로 센다
    const p = monById(s, m.pair);
    if (p && canFight(p)) {
      ev(s, 'twin', p.x, p.y);
      see(s, 'rush');
      provoke(s, p, tap, c.chain + 1, c.x - p.x, c.y - p.y, false);
    }
  }
  if (mode !== 2) credit(s, c, slot, cnt);
  c.r = radiusOf(s, c);
}
/** 이 톡의 싸움이 아직 이어지고 있나 (구름이 살아 있거나, 딱! 치는 중이거나, 달아나거나 날아가는 놈이 있다) */
function tapAlive(s: BrawlState, tap: number) {
  for (const c of s.clouds) if (!c.dead && c.taps.indexOf(tap) >= 0) return true;
  for (const m of s.mons) if (m.tap === tap && (m.st === HIT || m.st === DASH || m.st === FLEE || m.st === FLY)) return true;
  return false;
}
/**
 * 삼켜진 놈은 누구 몫인가: 무리는 '처음 건드린 톡'의 몫이다(그 톡의 싸움이 이어지는 동안).
 * 그래서 구름 숫자 = 톡 한 번으로 휘말린 수 — 다음 무리를 또 톡 하면 그 무리는 새 톡의 몫이 되고(구름은 합쳐져 이어진다), 저절로 번진 무리만 큰 숫자에 더해진다.
 */
function creditTap(s: BrawlState, c: Cloud, m: Mon) {
  const g = m.g;
  if (g < 0 || !s.groups[g] || s.groups[g].form !== 0) return c.tap;
  const o = s.gt[g];
  if (o === c.tap) return o;
  if (o && tapAlive(s, o)) return o;
  claim(s, c, g, c.tap);
  return c.tap;
}
/** 톡 하나가 무리 하나를 더 차지했다: 한 번 톡이 둘 · 셋 · 다섯 무리에 걸치면 띠 */
function claim(s: BrawlState, c: Cloud, g: number, tap: number) {
  s.gt[g] = tap;
  const n = ++s.tl[tap & 15], lv = LINK_AT.indexOf(n);
  if (lv < 0 || tap <= 1) return;
  s.wowN++;
  see(s, 'link' + lv);
  ev(s, 'link', c.x, c.y, lv, LINK_TEXT[lv]);
}
/** 톡의 몫이 하나 늘었다: '와' 띠 */
function credit(s: BrawlState, c: Cloud, slot: number, cnt: number) {
  while (s.tw[slot] < WOW_AT.length && cnt >= WOW_AT[s.tw[slot]]) {
    const lv = s.tw[slot]++;
    s.wowN++;
    if (s.firstWow < 0) s.firstWow = s.t;
    if (lv >= 1) see(s, 'wow' + Math.min(lv, 3));
    ev(s, 'wow', c.x, c.y, lv, WOW_TEXT[lv]);
  }
}
function koCount(s: BrawlState, m: Mon) {
  const slot = m.tap & 15, k = ++s.tk[slot];
  s.pts += k * k * (s.tw[slot] ? WOW_MUL[s.tw[slot] - 1] : 1); // k번째로 기절한 놈은 동전 k×k개 — '와' 띠가 뜬 톡은 그 몇 배
  s.kos++;
  if (k > s.bestTap && m.tap > 1) s.bestTap = k;
  if (!s.lite) {
    const key = m.k === 'boss' ? 'boss' + STAGES[s.stage].ch : m.k;
    s.dex[key] = (s.dex[key] ?? 0) + 1;
  }
  return k;
}
function fling(s: BrawlState, m: Mon, ang: number, dist: number, chain: number) {
  const T = 24 + Math.floor(s.rng() * 10);
  m.st = FLY;
  m.tm = T;
  m.cid = -1;
  m.gk = -1;
  m.chain = chain;
  m.vx = (Math.cos(ang) * dist) / T;
  m.vy = (Math.sin(ang) * dist * 0.62) / T;
  m.z = 0.02;
  m.vz = 0.0042 * T * 0.5;
}
function burst(s: BrawlState, c: Cloud) {
  c.dead = true;
  const mem: Mon[] = [];
  for (const m of s.mons) if (m.cid === c.id && m.st === INC) mem.push(m);
  // 보이는 놈이 24마리를 넘지 않게: 누워 있던 놈부터 치우고, 그래도 넘치는 놈은 튕겨 나오지 않고 별이 되어 사라진다(동전은 똑같이 센다)
  let shown = shownN(s);
  for (const m of s.mons) if (m.st === KO && shown + mem.length > MAX_SHOWN) (m.st = -1), shown--;
  const n = mem.length, room = Math.max(0, MAX_SHOWN - shown), nf = Math.max(1, Math.min(n, room)), base = s.rng() * TAU, d0 = Math.min(0.19, 0.11 + 0.025 * Math.sqrt(nf)), p0 = s.pts;
  mem.forEach((m, i) => {
    if (i < room || m.k === 'boss') fling(s, m, base + (TAU * i) / nf + jit(s.rng, 0.25), d0 * (0.75 + s.rng() * 0.6), c.chain);
    else (m.st = -1), (m.cid = -1);
    if (m.k === 'boss') (m.sky = true), (m.tm = 70), (m.vx = 0.004), (m.vy = -0.002), (m.vz = 0.02), (s.pts += BOSS_PTS);
    koCount(s, m);
  });
  ev(s, 'burst', c.x, c.y, n, String(s.pts - p0));
  s.lastBurstT = s.t;
  if (c.mega) {
    s.bossGone = true;
    // 대장이 날아가면 남은 놈들도 놀라서 다 나가떨어진다
    for (const m of s.mons) {
      if (!edible(m) && !(m.st === HIT)) continue;
      m.tap = c.tap;
      fling(s, m, Math.atan2(m.y - c.y, m.x - c.x) + jit(s.rng, 0.3), 0.16 + s.rng() * 0.1, c.chain);
      koCount(s, m);
    }
    ev(s, 'mega', c.x, c.y, n);
    see(s, 'megaburst');
  }
  // 벌집: 걷힐 때 벌이 가까운 한 놈을 쏜다 (그놈이 제 무리에서 또 싸움 — 한 톡에 두 번까지)
  if (s.perkB === 1 && c.chain <= 2 && !c.mega && n >= 2) {
    for (let q = 0; q < 1; q++) {
      let b: Mon | null = null, bd = 0.45 ** 2;
      for (const m of s.mons) {
        if (!canFight(m)) continue;
        const dd = (m.x - c.x) ** 2 + (m.y - c.y) ** 2;
        if (dd < bd) (bd = dd), (b = m);
      }
      if (!b) break;
      ev(s, 'bee', b.x, b.y, 0);
      provoke(s, b, c.tap, c.chain + 1, b.x - c.x, b.y - c.y, false);
    }
  }
}
/** 폭죽: 구름이 세 갈래로 튄다 */
function splitCloud(s: BrawlState, c: Cloud) {
  const mem: Mon[] = [];
  let boom: Mon | null = null;
  for (const m of s.mons) {
    if (m.cid !== c.id || m.st !== INC) continue;
    if (m.k === 'cracker' && !boom) boom = m;
    else mem.push(m);
  }
  ev(s, 'cracker', c.x, c.y, mem.length);
  see(s, 'split');
  if (boom) {
    fling(s, boom, -Math.PI / 2, 0.02, c.chain);
    boom.vz = 0.012;
    boom.tm = 40;
    koCount(s, boom);
  }
  if (mem.length < 2) {
    // 튈 만큼 없으면 구름이 크게 한 번 튕긴다
    const a = Math.atan2(c.vy, c.vx) + 0.9;
    c.vx = Math.cos(a) * V_ROCKET;
    c.vy = Math.sin(a) * V_ROCKET;
    c.kind = 2;
    c.age = 0;
    c.life += 30;
    c.n = mem.length;
    return;
  }
  c.dead = true;
  // 앞쪽(길 따라)으로 하나, 나머지는 위아래 뒤로
  const k = Math.min(3, mem.length), a0 = k === 2 ? 0.5 : 0;
  const parts: Mon[][] = [];
  for (let i = 0; i < k; i++) parts.push([]);
  mem.forEach((m, i) => parts[i % k].push(m));
  parts.forEach((p, i) => {
    const a = a0 + (TAU * i) / k;
    const rc = spawnCloud(s, p, c.x + Math.cos(a) * 0.03, c.y + Math.sin(a) * 0.02, Math.cos(a), Math.sin(a) * 0.7, c.tap, c.chain, 2, c);
    rc.life += 10 * p.length;
  });
}
function land(s: BrawlState, m: Mon) {
  if (m.sky) return void (m.st = KO), (m.tm = 1);
  m.x = clamp(m.x, 0.04, s.L - 0.05);
  m.y = clamp(m.y, MY0 - 0.03, MY1 + 0.03);
  m.z = 0;
  let hit: Mon | null = null, bd = 1e9;
  if (m.chain < 3) {
    for (const o of s.mons) {
      if (o === m || !(canFight(o) || o.st === SLEEP)) continue;
      const lim = (m.r + o.r) * 0.75, d = (o.x - m.x) ** 2 + ((o.y - m.y) * 1.4) ** 2;
      if (d < lim * lim && d < bd) (bd = d), (hit = o);
    }
  }
  m.st = KO;
  m.tm = KO_T;
  ev(s, 'land', m.x, m.y, hit ? 1 : 0);
  if (hit) {
    ev(s, 'angry', hit.x, hit.y, m.chain + 1);
    if (hit.st === SLEEP) wake(s, hit, m.tap, m.chain + 1);
    else provoke(s, hit, m.tap, m.chain + 1, m.vx, m.vy, false);
  }
}

/** m이 구름 c를 구경하러 오는 거리 */
const gawkOf = (s: BrawlState, m: Mon, c: Cloud) => GAWK_R * (m.k === 'chick' ? GAWK_CHICK : 1) * (s.perkB === 2 && c.chain === 1 && c.kind === 0 ? 1.6 : 1) + c.r;
function monsters(s: BrawlState) {
  const ms = s.mons, xmax = s.L - 0.38;
  for (let i = 0; i < ms.length; i++) {
    const m = ms[i];
    switch (m.st) {
      case IDLE: {
        if (m.cool > 0) m.cool--;
        m.gk = -1;
        if (m.k === 'guard') {
          // 순찰: 여우 쪽으로 걸어오며 눈금을 채운다 (싸움 구경은 안 한다)
          const d = m.x - s.fx, tx = s.fx + 0.15, dx = tx - m.x, dy = MY1 - 0.02 - m.y, l = Math.hypot(dx, dy);
          m.walk = l > 0.012;
          if (m.walk) (m.x += (dx / l) * GUARD_V), (m.y += (dy / l) * GUARD_V), (m.face = dx > 0 ? 1 : -1);
          if (s.st > GRACE && s.t > s.safeT && s.noticer < 0 && d < SIGHT && d > -0.1 && s.kb <= 0) {
            if (m.wind === 0) ev(s, 'spot', m.x, m.y);
            if (++m.wind >= WATCH_T) {
              m.st = NOTICE;
              m.tm = NOTICE_T;
              m.wind = 0;
              s.noticer = m.id;
              s.notices++;
              ev(s, 'notice', m.x, m.y);
              see(s, 'notice');
            }
          } else if (m.wind > 0) m.wind--;
          break;
        }
        if (m.k === 'owl') {
          // 구름이 보는 원 안에 들어오면 호루라기를 분다: '삐익! 싸움 그만!' — 구름이 그 자리에서 걷힌다(이어 가던 숫자가 거기서 끊긴다)
          if (m.wind < 0) m.wind++;
          else {
            let near = false;
            for (const c of s.clouds) if (!c.dead && !c.mega && (c.x - m.x) ** 2 + (c.y - m.y) ** 2 < OWL_R * OWL_R) near = true;
            if (near) {
              if (m.wind === 0) ev(s, 'puff', m.x, m.y);
              if (++m.wind >= OWL_WIND) {
                m.wind = -OWL_REST;
                for (const c of s.clouds) if (!c.dead && !c.mega && (c.x - m.x) ** 2 + (c.y - m.y) ** 2 < (OWL_R + 0.07) ** 2) burst(s, c);
                ev(s, 'whistle', m.x, m.y);
                see(s, 'whistle');
              }
            } else if (m.wind > 0) m.wind = Math.max(0, m.wind - 2);
          }
        }
        if (m.k === 'boss') {
          // 대장: 시끄러운 구름 쪽으로 쿵쿵 걸어온다 (작으면 걷어차고, 크면 삼켜진다) — 조용해지면 제자리로
          let bc: Cloud | null = null, bd = 0.62 ** 2;
          for (const c of s.clouds) {
            if (c.dead || c.mega) continue;
            const d = (c.x - m.x) ** 2 + (c.y - m.y) ** 2;
            if (d < bd) (bd = d), (bc = c);
          }
          const tx = bc ? bc.x : m.hx, ty = bc ? bc.y : m.hy, dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy);
          m.walk = d > 0.01;
          if (d > 0.01) (m.x += (dx / d) * Math.min(0.0034, d)), (m.y = clamp(m.y + (dy / d) * Math.min(0.0034, d), MY0 + 0.04, MY1 - 0.02)), (m.face = dx > 0 ? 1 : -1);
          break;
        }
        // 가장 가까운 구름
        let bc: Cloud | null = null, bd = 1e9;
        for (const c of s.clouds) {
          if (c.dead) continue;
          const d = (c.x - m.x) ** 2 + (c.y - m.y) ** 2;
          if (d < bd) (bd = d), (bc = c);
        }
        if (bc) {
          const d = Math.sqrt(bd) || 0.001;
          if (m.k === 'rabbit') {
            // 토끼: 구경은커녕 구름 반대쪽으로 달아난다
            if (m.cool <= 0 && d < 0.2 + bc.r) {
              m.st = FLEE;
              m.tm = FLEE_T;
              // 달아나는 쪽: 길 앞쪽의 다른 무리(거기 부딪혀 또 싸움) — 없으면 구름 반대쪽
              let to: Mon | null = null, td = 0.8 ** 2;
              for (const o of ms) {
                if (o === m || o.g === m.g || !canFight(o) || o.gk >= 0 || o.x < m.x) continue;
                const q = (o.x - m.x) ** 2 + (o.y - m.y) ** 2;
                if (q < td) (td = q), (to = o);
              }
              const ux = to ? to.x - m.x : (m.x - bc.x) / d + 0.5, uy = to ? to.y - m.y : (m.y - bc.y) / d, ul = Math.hypot(ux, uy) || 1;
              m.vx = (ux / ul) * FLEE_V;
              m.vy = (uy / ul) * FLEE_V;
              m.tap = bc.tap;
              m.chain = bc.chain;
              m.face = m.vx >= 0 ? 1 : -1;
              ev(s, 'flee', m.x, m.y);
              see(s, 'flee');
              break;
            }
          } else if (d < gawkOf(s, m, bc)) m.gk = bc.id;
        }
        if (m.still) break;
        let sp = KSPD[m.k];
        if (m.gk >= 0 && bc) {
          // 구경: 구름 바깥 둘레로 달려가 선다 ('오오~')
          const d = Math.sqrt(bd) || 0.001, ring = bc.r + m.r + GAWK_GAP;
          GX = bc.x + ((m.x - bc.x) / d) * ring;
          GY = bc.y + ((m.y - bc.y) / d) * ring;
          sp = m.k === 'chick' ? 0.0095 : GAWK_V;
          m.face = bc.x >= m.x ? 1 : -1;
        } else goal(s, m);
        const dx = GX - m.x, dy = GY - m.y, d = Math.hypot(dx, dy);
        m.walk = d > 0.004;
        if (d > 1e-4) {
          const stp = Math.min(sp, d);
          m.x += (dx / d) * stp;
          m.y += (dy / d) * stp;
          if (m.gk < 0 && Math.abs(dx) > 0.004) m.face = dx > 0 ? 1 : -1;
        }
        m.x = clamp(m.x, 0.08, xmax);
        m.y = clamp(m.y, MY0, MY1);
        break;
      }
      case ENTER: {
        goal(s, m);
        const dx = GX - m.x, dy = GY - m.y, d = Math.hypot(dx, dy);
        m.walk = true;
        m.face = dx > 0 ? 1 : -1;
        if (d < 0.02 || (m.x < xmax && m.y > MY0 && d < 0.12)) m.st = IDLE;
        else (m.x += (dx / d) * 0.0042), (m.y += (dy / d) * 0.0042);
        break;
      }
      case DASH: {
        let b = monById(s, m.tgt);
        if (!b || !canFight(b)) {
          b = nearestFighter(s, m);
          if (b) m.tgt = b.id;
        }
        if (!b || ++m.tm > 110) {
          provokeSolo(s, m);
          break;
        }
        const dx = b.x - m.x, dy = b.y - m.y, d = Math.hypot(dx, dy) || 0.001;
        m.face = dx >= 0 ? 1 : -1;
        m.walk = true;
        if (d <= m.r + b.r + BONK_GAP) provoke(s, m, m.tap, m.chain, dx, dy, false);
        else (m.x += (dx / d) * DASH_V), (m.y += (dy / d) * DASH_V);
        break;
      }
      case HIT: {
        if (--m.tm > 0) break;
        if (m.tgt === T_VICTIM) m.st = IDLE; // 때린 놈이 먼저 딴 구름에 삼켜졌다
        else if (m.tgt === T_BOAR) {
          spawnCloud(s, [m], m.x, m.y, Math.cos(m.ang), Math.sin(m.ang) * 0.8, m.tap, m.chain, 1);
          ev(s, 'charge', m.x, m.y);
          see(s, 'charge');
        } else if (m.tgt === T_SOLO) spawnCloud(s, [m], m.x, m.y, m.dx, m.dy, m.tap, m.chain, 0);
        else {
          const mem = [m];
          for (const id of [m.tgt, m.tgt2]) {
            const b = id >= 0 ? monById(s, id) : null;
            if (b && b.st === HIT && b.tgt === T_VICTIM) mem.push(b);
          }
          spawnCloud(s, mem, m.px, m.py, m.dx, m.dy, m.tap, m.chain, 0);
        }
        break;
      }
      case FLY: {
        m.x += m.vx;
        m.y += m.vy;
        m.z = Math.max(0, m.z + m.vz);
        m.vz -= m.sky ? 0 : 0.0042;
        if (--m.tm <= 0) land(s, m);
        break;
      }
      case KO:
      case DAZE: {
        if (--m.tm <= 0) {
          if (m.st === KO) m.st = -1;
          else m.st = IDLE;
        }
        break;
      }
      case NOTICE: {
        const tx = s.fx + 0.1, ty = MY1, dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy);
        m.face = dx >= 0 ? 1 : -1;
        m.walk = d > 0.01;
        if (d > 0.01) (m.x += (dx / d) * Math.min(0.003, d)), (m.y += (dy / d) * Math.min(0.003, d));
        if (--m.tm <= 0) {
          // 꿀밤!
          m.st = IDLE;
          s.noticer = -1;
          s.hearts--;
          s.hits++;
          s.kb = 34;
          s.alert = 0.2;
          s.safeT = s.t + SAFE_T;
          ev(s, 'bonkfox', s.fx, FOX_Y);
          if (s.hearts <= 0) endStage(s, false);
        }
        break;
      }
      case FLEE: {
        m.x += m.vx;
        m.y += m.vy;
        if ((m.y < MY0 && m.vy < 0) || (m.y > MY1 && m.vy > 0)) m.vy = -m.vy;
        if ((m.x < Math.max(0.08, s.cam + 0.04) && m.vx < 0) || (m.x > Math.min(xmax, s.cam + 0.98) && m.vx > 0)) (m.vx = -m.vx), (m.face = -m.face);
        let hit: Mon | null = null;
        for (const o of ms) {
          if (o === m || !(canFight(o) || o.st === SLEEP) || o.gk >= 0) continue;
          const lim = m.r + o.r;
          if ((o.x - m.x) ** 2 + (o.y - m.y) ** 2 < lim * lim * 0.8) {
            hit = o;
            break;
          }
        }
        if (hit) {
          m.chain++;
          ev(s, 'bump', hit.x, hit.y, m.chain);
          see(s, 'bump');
          if (hit.st === SLEEP) wake(s, hit, m.tap, m.chain), (m.st = DAZE), (m.tm = 40);
          else (m.st = IDLE), provoke(s, m, m.tap, m.chain, m.vx, m.vy, false);
        } else if (--m.tm <= 0) (m.st = IDLE), (m.cool = FLEE_COOL), ev(s, 'pant', m.x, m.y);
        break;
      }
    }
  }
}
function provokeSolo(s: BrawlState, m: Mon) {
  m.st = HIT;
  m.tm = HIT_T;
  m.tgt = T_SOLO;
  m.dx = m.face;
  m.dy = 0;
  m.px = m.x;
  m.py = m.y;
  m.hitT = s.t;
  ev(s, 'solo', m.x, m.y);
}

function clouds(s: BrawlState) {
  const cs = s.clouds, ms = s.mons, n0 = cs.length;
  const seekV = SEEK_V * (1 + 0.02 * s.level) * (s.perkA === 2 ? 1.2 : 1), sense = SENSE_R;
  const xl = Math.max(0.07, s.cam + 0.05), xr = Math.min(s.L - 0.34, s.cam + 0.97);
  for (let ci = 0; ci < n0; ci++) {
    const c = cs[ci];
    if (c.dead) continue;
    c.age++;
    if (c.kick > 0) c.kick--;
    if (c.nomerge > 0) c.nomerge--;
    let rushing = false;
    const flying = (c.kind === 1 && c.age < CHARGE_T) || (c.kind === 2 && c.age < ROCKET_T) || c.kick > 20;
    if (c.mega) (c.vx *= 0.88), (c.vy *= 0.88);
    else if (flying) {
      if (c.kind === 2) (c.vx *= 0.955), (c.vy *= 0.955);
    } else if (c.age > BLOOM) {
      // 굴러가기: 가까운 다른 구름이 있으면 서로 달려들어 합체, 아니면 가장 가까운 깨어 있는 놈 쪽으로.
      // 구경 온 놈은 얼른 덮치고, 아직 구경 안 하는 다음 무리 쪽으로는 어슬렁 굴러간다(그동안 그 무리를 톡 하면 두 구름이 합체)
      let tm: Mon | null = null, md = 1e9;
      for (let i = 0; i < ms.length; i++) {
        const m = ms[i];
        // 제자리에 버티고 선 특별한 놈은 쫓지 않는다(그놈부터 톡 해야 낀다 — 잠든 멧돼지는 굴러가 깨운다) · 순찰은 안 쫓는다 · 대장은 숫자가 될 때만
        if (!edible(m) || (m.still && m.k !== 'boss' && m.st !== SLEEP) || (m.k === 'guard' && m.st === IDLE) || (m.k === 'boss' && s.tc[c.tap & 15] < s.bossNeed)) continue;
        const d = (m.x - c.x) ** 2 + (m.y - c.y) ** 2;
        if (d < md) (md = d), (tm = m);
      }
      md = Math.sqrt(md);
      let oc: Cloud | null = null, od = LINK_R;
      for (const o of cs) {
        if (o === c || o.dead || o.nomerge > 0 || c.nomerge > 0) continue;
        const d = Math.hypot(o.x - c.x, o.y - c.y);
        if (d < od) (od = d), (oc = o);
      }
      let tx = 0, ty = 0, sp = 0;
      if (oc && (md > c.r + 0.1 || md > od) && c.rush < LINK_T) (tx = oc.x), (ty = oc.y), (sp = LINK_V), (rushing = true), c.rush++;
      else if (tm && md < sense + c.r) {
        const eager = tm.gk === c.id || tm.st !== IDLE || tm.k === 'boss' || md < c.r + 0.1;
        tx = tm.x;
        ty = tm.y;
        // 덩치가 낀 구름은 다 삼킨 뒤 다음 무리까지 한 번 데굴데굴 밀고 간다(그동안 수명이 안 준다)
        let boosting = false;
        if (eager) {
          if (c.bu) (c.boost = 0), (c.bu = 0);
        } else if (c.boost > 0) c.boost--, (c.bu = 1), (boosting = rushing = true);
        sp = eager ? (md < c.r + 0.12 ? POUNCE_V : seekV) : boosting ? seekV : DRIFT_V;
      }
      if (sp > 0) {
        const d = Math.hypot(tx - c.x, ty - c.y) || 0.001;
        c.vx += (((tx - c.x) / d) * sp - c.vx) * 0.3;
        c.vy += (((ty - c.y) / d) * sp - c.vy) * 0.3;
      } else (c.vx *= 0.85), (c.vy *= 0.85);
    }
    if (!rushing) c.life--;
    if (c.kind !== 0 || c.age > BLOOM) (c.x += c.vx), (c.y += c.vy);
    if (flying) {
      if ((c.y < MY0 && c.vy < 0) || (c.y > MY1 && c.vy > 0)) (c.vy = -c.vy), ev(s, 'wall', c.x, c.y);
      if ((c.x < xl && c.vx < 0) || (c.x > xr && c.vx > 0)) (c.vx = -c.vx), ev(s, 'wall', c.x, c.y);
    } else (c.x = clamp(c.x, xl, xr)), (c.y = clamp(c.y, MY0, MY1));
    if (c.kind !== 0 && !flying) (c.kind = 0), (c.life = Math.max(c.life, 60)); // 돌진·폭죽이 멈춘 자리에서 구경꾼을 기다린다
    if (c.tor > 0) {
      c.tor--;
      const R = c.mega ? 1.6 : 0.5, pull = c.mega ? 0.011 : 0.007;
      for (const m of ms) {
        if (m.k === 'boss' || !(m.st === IDLE || m.st === DAZE || m.st === ENTER || m.st === NOTICE)) continue;
        const dx = c.x - m.x, dy = c.y - m.y, d2 = dx * dx + dy * dy;
        if (d2 > R * R || d2 < 1e-6) continue;
        const d = Math.sqrt(d2);
        m.x += (dx / d) * pull;
        m.y += (dy / d) * pull;
      }
    }
    // 닿은 놈을 삼킨다 — 보통 구름은 '뽁 뽁 뽁' 박자로 하나씩 (가까운 놈부터)
    if (c.eat > 0) c.eat--;
    let pick: Mon | null = null, pd = 1e9;
    for (let i = 0; i < ms.length; i++) {
      const m = ms[i];
      if (!edible(m)) continue;
      const lim = c.r + m.r * 0.55, dx = m.x - c.x, dy = m.y - c.y, d2 = dx * dx + dy * dy;
      if (d2 > lim * lim) continue;
      if (c.kind === 0 && !flying && !c.mega && c.tor <= 0 && m.k !== 'boss' && m.st !== SLEEP) {
        if (d2 < pd) (pd = d2), (pick = m);
        continue;
      }
      if (m.k === 'boss') {
        if (c.mega) continue;
        if (s.tc[c.tap & 15] >= s.bossNeed) {
          swallow(s, c, m);
          c.mega = 1;
          c.tor = 9999;
          c.split = 0;
          c.life = 130;
          c.vx = c.vy = 0;
          c.r = radiusOf(s, c);
          ev(s, 'bossin', m.x, m.y, c.n);
          see(s, 'mega');
        } else if (c.kick <= 0) {
          const d = Math.hypot(dx, dy) || 0.001;
          c.vx = (-dx / d) * 0.021;
          c.vy = (-dy / d) * 0.021 + jit(s.rng, 0.004);
          c.kick = 45;
          c.life += 26;
          s.kicks++;
          s.bossNeed = Math.max(Math.ceil(STAGES[s.stage].boss!.need * 0.6), s.bossNeed - 1);
          m.hitT = s.t;
          ev(s, 'kick', m.x, m.y, s.bossNeed);
          see(s, 'kick');
        }
        continue;
      }
      if (m.st === SLEEP) {
        if (c.kind === 1 && c.age < 4) continue;
        wake(s, m, c.tap, c.chain + 1);
        continue;
      }
      swallow(s, c, m);
    }
    if (pick && c.eat <= 0 && !c.dead) swallow(s, c, pick), (c.eat = EAT_T);
    if (c.split > 0 && --c.split === 0) splitCloud(s, c);
    if (!c.dead && (c.life <= 0 || c.age > AGE_MAX)) burst(s, c);
  }
  // 구름끼리 만나면 합쳐진다 (숫자는 큰 쪽 톡의 것이 이어진다)
  for (let i = 0; i < cs.length; i++) {
    const a = cs[i];
    if (a.dead || a.nomerge > 0) continue;
    for (let j = i + 1; j < cs.length; j++) {
      const b = cs[j];
      if (b.dead || b.nomerge > 0) continue;
      const lim = (a.r + b.r) * 0.85;
      if ((a.x - b.x) ** 2 + (a.y - b.y) ** 2 > lim * lim) continue;
      const ca = s.tc[a.tap & 15], cb = s.tc[b.tap & 15];
      const [big, sm] = a.mega || (!b.mega && (ca > cb || (ca === cb && a.n >= b.n))) ? [a, b] : [b, a];
      // 합체: 숫자는 큰 쪽 톡의 것이 이어진다 (작은 구름이 삼킨 놈들은 그대로 작은 쪽 톡의 몫)
      for (const m of ms) if (m.cid === sm.id && m.st === INC) m.cid = big.id;
      for (const t of sm.taps) if (big.taps.indexOf(t) < 0) big.taps.push(t);
      big.boost = Math.max(big.boost, sm.boost);
      const wa = big.n, wb = sm.n;
      if (!big.mega) (big.vx = (big.vx * wa + sm.vx * wb) / (wa + wb)), (big.vy = (big.vy * wa + sm.vy * wb) / (wa + wb)), (big.x = (big.x * wa + sm.x * wb) / (wa + wb)), (big.y = (big.y * wa + sm.y * wb) / (wa + wb));
      big.n += sm.n;
      big.w += sm.w;
      big.life = Math.max(big.life, sm.life, lingerOf(s));
      big.tor = Math.max(big.tor, sm.tor);
      big.rush = 0;
      if (sm.split > 0 && !big.mega) big.split = Math.max(big.split, sm.split);
      if (big.kind === 1) big.kind = 0;
      big.chain = Math.max(big.chain, sm.chain);
      if (!s.lite) for (const q of sm.cols) if (big.cols.length < 8) big.cols.push(q);
      big.r = radiusOf(s, big);
      big.popT = s.t;
      sm.dead = true;
      ev(s, 'merge', big.x, big.y, big.n);
      see(s, 'merge', '팁:톡 한 번에 휘말린 수 — 저절로 번지면 커져요');
    }
  }
}

function fox(s: BrawlState) {
  if (s.kb > 0) {
    s.fx = Math.max(0.1, s.fx - 0.3 * ((s.kb / 34) ** 2 - ((s.kb - 1) / 34) ** 2));
    s.kb--;
    s.blocked = false;
    return;
  }
  let block: Mon | null = null, bd = 9, ahead = 9, cloudAhead = 9;
  for (const m of s.mons) {
    if (!blocks(m)) continue;
    const d = m.x - s.fx;
    if (d < -0.05) continue;
    if (d < ahead) ahead = d;
    if (d < STOP + (m.k === 'boss' ? 0.1 : 0) && d < bd) (bd = d), (block = m);
  }
  let cw = false;
  for (const c of s.clouds) {
    if (c.dead) continue;
    const d = c.x - s.fx;
    if (d > -0.14 && d < 0.12 + c.r) cw = true;
    if (d > -0.14 && d < cloudAhead) cloudAhead = d;
  }
  s.cloudWait = cw;
  s.blocked = !!block;
  if (block || cw) s.blockT++;
  else {
    s.blockT = 0;
    // 길이 훤히 비었거나, 앞서 굴러가는 구름을 따라잡을 때는 달린다 (구름 바로 뒤에서 구경해야 다음 무리가 보인다)
    s.run = Math.min(ahead, cloudAhead) > CLEAR || (cloudAhead < ahead && cloudAhead > CHASE);
    s.fx += s.run ? (cloudAhead < ahead && cloudAhead > 0.45 ? SPRINT : RUN) : WALK;
  }
  // 들킴: 오래 숨어만 있으면 눈금이 찬다 (싸움 구경에 정신 팔린 놈 앞에서는 안 찬다)
  if (s.noticer === -2) (s.noticer = -1), (s.alert = Math.min(s.alert, 0.4)), (s.safeT = s.t + 150), ev(s, 'phew', s.fx, FOX_Y);
  if (s.noticer >= 0) {
    const m = monById(s, s.noticer);
    if (!m || m.st !== NOTICE) (s.noticer = -1), (s.alert = Math.min(s.alert, 0.4)), (s.safeT = s.t + 150);
  } else if (s.st > GRACE && s.t > s.safeT) {
    if (block && block.k !== 'guard') {
      let busy = block.st !== IDLE || block.gk >= 0;
      if (!busy) for (const c of s.clouds) if (!c.dead && (c.x - block.x) ** 2 + (c.y - block.y) ** 2 < 0.45 ** 2) busy = true;
      if (!busy) s.alert += 1 / PATIENCE[Math.min(s.stage, PATIENCE.length - 1)];
    }
    s.alert = Math.max(0, s.alert - 0.00035);
    if (s.alert >= 1) {
      // 여우에게 가장 가까운 놈이 알아챈다
      let nm: Mon | null = null, nd = 0.62;
      for (const m of s.mons) {
        if (m.st !== IDLE || m.still || m.k === 'guard') continue;
        const d = m.x - s.fx;
        if (d > -0.05 && d < nd) (nd = d), (nm = m);
      }
      if (nm) {
        nm.st = NOTICE;
        nm.tm = NOTICE_T;
        s.noticer = nm.id;
        s.notices++;
        ev(s, 'notice', nm.x, nm.y);
        see(s, 'notice');
      }
      s.alert = nm ? 1 : 0.97;
    }
  } else s.alert = Math.max(0, s.alert - 0.008);
  if (s.fx >= s.potX - 0.1) endStage(s, true);
}

/** 순찰 도깨비: 여우가 정해진 자리를 지나면 화면 오른쪽에서 걸어 들어온다 */
function guards(s: BrawlState) {
  const d = STAGES[s.stage];
  if (!d.guards || s.guardN >= d.guards.length || s.fx < d.guards[s.guardN] || shownN(s) >= MAX_SHOWN) return;
  s.guardN++;
  const x = Math.min(s.L - 0.42, s.cam + 1.08);
  if (x - s.fx < 0.5) return;
  const m = mk(s, 'guard', x, MY1 - 0.03 - s.rng() * 0.06, -1);
  m.face = -1;
  if (!s.lite && !s.seen.has('guard')) (s.spot = { k: 'guard', t: s.t }), see(s, 'guard', "순찰 도깨비 — 눈금이 차기 전에 톡!");
  ev(s, 'guard', m.x, m.y);
}

/** 대장 판: 졸개가 계속 몰려온다 (화면에 24마리 넘지 않게) */
function bossWaves(s: BrawlState) {
  const d = STAGES[s.stage];
  if (!d.boss || s.bossGone) return;
  const gi = s.groups.length - 1, Gp = s.groups[gi];
  if (!Gp.born || ++s.bossT < 200) return;
  let awake = 0;
  for (const m of s.mons) if (m.k !== 'boss' && blocks(m) && m.x > s.L - 1.6) awake++;
  if (awake >= 10 || shownN(s) >= MAX_SHOWN - 3) return void (s.bossT = 140);
  s.bossT = 0;
  const n = 3 + (s.rng() < 0.5 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const k = CH[d.boss.pool[Math.floor(s.rng() * d.boss.pool.length)]];
    const m = mk(s, k, Gp.x + jit(s.rng, 0.3), MY0 - 0.13 - s.rng() * 0.05, gi);
    m.st = ENTER;
    m.still = k === 'bear';
    m.a = s.rng() * TAU;
    m.f = 0.5 + s.rng() * 0.5;
    m.dir = s.rng() < 0.5 ? -1 : 1;
    if (m.still) (m.hx = Gp.x + jit(s.rng, 0.14)), (m.hy = Gp.y + jit(s.rng, 0.1));
  }
  ev(s, 'wave', Gp.x, Gp.y, n);
}

/** 결과 화면 동안: 날던 놈은 떨어지고 기절한 놈은 사라진다 (새 싸움은 없다) */
function settle(s: BrawlState) {
  for (const m of s.mons) {
    if (m.st === FLY) {
      m.x += m.vx;
      m.y += m.vy;
      m.z = Math.max(0, m.z + m.vz);
      m.vz -= m.sky ? 0 : 0.0042;
      if (--m.tm <= 0) (m.st = m.sky ? -1 : KO), (m.tm = KO_T), (m.z = 0);
    } else if (m.st === KO && --m.tm <= 0) m.st = -1;
  }
  if (s.mons.some((m) => m.st === -1)) s.mons = s.mons.filter((m) => m.st !== -1);
}

function endStage(s: BrawlState, ok: boolean) {
  if (s.phase !== 'play') return;
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.noticer = -1;
  for (const m of s.mons) if (m.st === NOTICE) m.st = IDLE;
  if (ok) {
    const d = STAGES[s.stage];
    s.starOk = [true, s.hits === 0, s.bestTap >= d.need];
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS + CLEAR_PTS;
    s.level++;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    if (d.boss && s.hearts < 3) s.hearts++;
    ev(s, 'clear', s.potX, FOX_Y, s.got);
  } else ev(s, 'fail', s.fx, FOX_Y);
}

function world(s: BrawlState) {
  s.st++;
  // 1판 첫 화면: 저쪽에서 벌써 둘이 싸움이 붙는다 (구경)
  if (s.stage === 0 && s.st === 24 && s.taps === 0 && s.mons.length > 6) {
    const a = s.mons[5], b = s.mons[6];
    if (a.st === IDLE && b.st === IDLE && a.g === 1) (a.tap = 1), (a.chain = 1), startHit(s, a, b, (a.x + b.x) / 2, (a.y + b.y) / 2);
  }
  monsters(s);
  if (s.phase !== 'play') return;
  if ((s.st & 1) === 0) separate(s);
  clouds(s);
  fox(s);
  if ((s.st & 7) === 0) spawnGroups(s), guards(s);
  bossWaves(s);
  let dead = false;
  for (const m of s.mons) if (m.st === -1) dead = true;
  if (dead) s.mons = s.mons.filter((m) => m.st !== -1);
  if (s.clouds.length && s.clouds.some((c) => c.dead)) s.clouds = s.clouds.filter((c) => !c.dead);
  s.cam = clamp(s.fx - FOX_SX, 0, s.L - 1);
}

function doTap(s: BrawlState, px: number, py: number) {
  if (s.cd > 0) return void ev(s, 'cool', px + s.cam, py);
  const wx = px + s.cam;
  let best: Mon | null = null, bd = 1e9;
  for (const m of s.mons) {
    if (!tappable(m)) continue;
    const mx = m.x - s.cam;
    if (mx < -0.03 || mx > 1.03) continue;
    // 손가락에서 몸 가장자리까지의 거리 — 특별한 놈은 판정이 더 크다
    const d = Math.hypot(m.x - wx, m.y - m.r * 0.7 - py) - m.r - (SPECIAL[m.k] ?? 0) - (m.st === NOTICE ? 0.06 : 0);
    if (d < bd) (bd = d), (best = m);
  }
  if (!best) return void ev(s, 'none', wx, py);
  tapMon(s, best);
}
function tapMon(s: BrawlState, m: Mon) {
  s.cd = CD;
  s.taps++;
  s.stageTaps++;
  if (s.firstTap < 0) s.firstTap = s.t;
  // 톡마다 새 숫자 (아직 이어지는 싸움이 쓰는 칸은 건너뛴다)
  let tap = 0;
  for (let i = 0; i < 16; i++) {
    tap = ++s.tapN;
    let busy = false;
    for (const c of s.clouds) if (!c.dead) for (const t of c.taps) if ((t & 15) === (tap & 15)) busy = true;
    if (!busy) break;
  }
  const slot = tap & 15;
  s.tc[slot] = s.tk[slot] = s.tw[slot] = s.tl[slot] = 0;
  ev(s, 'tap', m.x, m.y);
  if (m.st === SLEEP) wake(s, m, tap, 1);
  else if (m.k === 'guard') {
    // 순찰 도깨비: 화들짝 놀라 제풀에 넘어져 혼자 구름이 된다 (남의 무리는 안 건드린다)
    if (s.noticer === m.id) s.noticer = -2;
    m.tap = tap;
    m.chain = 1;
    m.wind = 0;
    provokeSolo(s, m);
  } else (m.st = IDLE), (m.wind = Math.min(m.wind, 0)), provoke(s, m, tap, 1, m.face, 0, true);
}

function pickPerk(s: BrawlState, side: number) {
  const ch = STAGES[s.stage].ch;
  if (ch === 0) s.perkA = side + 1;
  else s.perkB = side + 1;
  s.pickSel = side;
  see(s, PICKS[ch][side].key);
  ev(s, 'pick', side ? 0.72 : 0.28, 0.95, side);
}

function cosmetic(s: BrawlState) {
  if (s.events.length > 80) s.events = s.events.filter((e) => s.t - e.t < 120);
  if (s.spot && s.t - s.spot.t > 260) s.spot = null;
  if (s.news && s.t - s.news.t > 210) s.news = null;
  if (!s.news && s.newsQ.length) s.news = { text: s.newsQ.shift()!, t: s.t };
}

const game: GameDef<BrawlState> & { wows(s: BrawlState): number } = {
  id: 'brawlstart',
  name: '싸움 붙이기',
  genes: ['brawlstart', 'chain', 'collect'],
  twist: "나는 못 싸운다 — 톡 한 놈이 옆 놈 뒤통수를 '딱!' 치면 싸움 구름이 되고, 구경하러 몰려온 놈들까지 굴러가며 다 삼킨다. 구름 숫자는 '톡 한 번으로 휘말린 수' — 톡을 아끼고 곰·멧돼지·토끼가 옆 무리로 옮기게 해서 톡 한 번으로 길 전체를 한 구름으로",
  rules: [
    "몬스터를 톡 하면 옆 놈을 '딱!' — 싸움 구름이 되어, 구경하러 몰려온 놈들을 굴러가며 다 삼켜요.",
    '구름 숫자 = 톡 한 번으로 휘말린 수. 덩치 곰·멧돼지 같은 특별한 놈부터 톡 하면 옆 무리까지 번져요 — 숫자가 클수록 동전이 몇 배.',
    "오래 숨어 있거나 순찰에게 들키면 '!' — 그놈을 얼른 톡 못 하면 꿀밤(하트 -1).",
  ],
  controls: 'touch',
  hint: '몬스터를 톡 = 옆 놈을 딱! 싸움 붙이기 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '햇살 좋은 몬스터 장터 길의 꼬마 여우 장난꾸러기 — 손그림 스티커 같은 만화 싸움 구름 소동',
    mood: '줄무늬 천막과 깃발이 늘어선 밝은 낮의 장터 길. 통통한 도깨비·곰·토끼가 어슬렁대다 톡 한 번에 먼지 구름 속 주먹다짐이 되고, 구경하러 몰려온 놈들까지 별과 신발이 튀어나오는 구름에 휘말려 온 장터를 삼킨다. 덤불 뒤에 숨은 꼬마 여우는 킥킥 웃으며 꿀단지를 향해 살금살금 걷는다.',
    palette: { bg: '#ffe9b8', ink: '#4a2e1a', muted: '#9a7b5a', accent: '#ffb52e', hot: '#ff5a3c', soft: '#fff6dc' },
  },
  guard: (s) => s.hearts,
  cleared: (s) => (s.phase === 'result' && s.ok ? { stage: s.stage, got: s.got, of: 3 } : null),
  reveals: (s) => s.seen.size,
  wows: (s) => s.wowN,
  create(seed) {
    const z = () => new Array(16).fill(0);
    const s = {
      rng: mulberry32(seed), seed, t: 0, st: 0, stage: 0, phase: 'play', pt: 0, ok: false, lite: false,
      hearts: 3, stars: 0, got: 0, starOk: [false, false, false], pts: 0, won: false, dead: false, level: 0, perkA: 0, perkB: 0,
      L: 3, potX: 2.8, cam: 0, flip: false, fx: 0.13, kb: 0, blocked: false, blockT: 0, run: false, alert: 0, noticer: -1, safeT: 0, cloudWait: false,
      mons: [], clouds: [], groups: [], gt: [], nid: 0, twinOpen: -1, guardN: 0, bossId: -1, bossNeed: 0, bossGone: false, bossT: 0, kicks: 0,
      down: false, cd: 0, taps: 0, stageTaps: 0, tapN: 1, tc: z(), tk: z(), tw: z(), tl: z(),
      bestTap: 0, hits: 0, notices: 0, kos: 0, chainMax: 0, wowN: 0, firstTap: -1, firstWow: -1,
      dex: {}, seen: new Set<string>(), newsQ: [], news: null, spot: null, events: [],
      lastBurstT: -999, pickSel: -1, lvT: -999,
    } as BrawlState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    const p = inp.pointer ?? null, fresh = !!p && !s.down;
    s.down = !!p;
    if (s.cd > 0) s.cd--;
    if (s.phase === 'play') {
      if (fresh) doTap(s, p!.x, p!.y * A);
      world(s);
    } else if (s.phase === 'result') {
      s.pt++;
      settle(s); // 날아가던 놈들은 마저 떨어진다
      if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL) || (fresh && s.pt > RESULT_MIN)) {
        if (!s.ok || s.won) s.dead = true;
        else if (STAGES[s.stage].boss && STAGES[s.stage].ch < PICKS.length) (s.phase = 'pick'), (s.pt = 0), (s.pickSel = -1), ev(s, 'pickopen', 0.5, 0.9);
        else s.stage++, newStage(s);
      }
    } else {
      s.pt++;
      if (s.pickSel < 0) {
        if (fresh && s.pt > PICK_MIN) pickPerk(s, p!.x < 0.5 ? 0 : 1);
        else if (inp.pick !== undefined && inp.pick < 2 && s.pt > PICK_MIN) pickPerk(s, inp.pick);
        else if (s.pt >= PICK_AUTO) pickPerk(s, 0);
        if (s.pickSel >= 0) s.pt = 2000;
      } else if (s.pt >= 2000 + 70) s.stage++, newStage(s);
    }
    cosmetic(s);
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const brawlstart = game;

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x: clamp(x, 0, 1), y: clamp(y / A, 0, 1) } });
const tapAt = (s: BrawlState, m: Mon) => at(m.x - s.cam, m.y - m.r * 0.7);
const onScreen = (s: BrawlState, m: Mon) => m.x - s.cam > 0.01 && m.x - s.cam < 0.99;

/** 내다보기용 복사 (연출·도감은 건드리지 않는다) */
function cloneSim(s: BrawlState): BrawlState {
  return {
    ...s, lite: true, rng: mulberry32((s.seed ^ Math.imul(s.t + 1, 0x9e3779b1)) >>> 0),
    mons: s.mons.map((m) => ({ ...m })), clouds: s.clouds.map((c) => ({ ...c, taps: c.taps.slice() })), groups: s.groups.map((g) => ({ ...g })), gt: s.gt.slice(),
    tc: s.tc.slice(), tk: s.tk.slice(), tw: s.tw.slice(), tl: s.tl.slice(), events: [], newsQ: [], starOk: s.starOk,
  };
}
const quiet = (s: BrawlState) => {
  if (s.clouds.length || s.noticer >= 0) return false;
  for (const m of s.mons) if (m.st === HIT || m.st === DASH || m.st === FLY || m.st === FLEE) return false;
  return true;
};
function runSim(c: BrawlState, max: number) {
  for (let i = 0; i < max && c.phase === 'play'; i++) {
    c.t++;
    world(c);
    if (i > 16 && quiet(c)) break;
  }
  // 아직 굴러가는 구름은 그 자리에서 걷힌 것으로 센다
  if (c.phase === 'play') for (const q of c.clouds) if (!q.dead) burst(c, q);
}
/** 결과·장 끝 화면 넘기기 (모든 봇 공통) */
function between(s: BrawlState, side: number): Input | null {
  if (s.phase === 'result') return !s.down && s.pt > RESULT_MIN + 2 ? at(0.5, 0.9) : NO;
  if (s.phase === 'pick') return !s.down && s.pickSel < 0 && s.pt > PICK_MIN + 2 ? at(side ? 0.72 : 0.28, 0.95) : NO;
  return null;
}

const smartMem = new WeakMap<object, { next: number }>();
/**
 * 잘하는 봇: 실제로 굴려 보고(내다보기) 고른다.
 *  - 싸움을 열 때: 여우가 다가가 막힐 때까지 기다렸다가(다음 무리까지 화면에 들어온다) 특별한 놈 · 무리마다 한 놈을 굴려 보고 한 번 톡에 가장 크게 번지는 놈.
 *  - 구름이 굴러가는 동안: 그 큰 숫자가 더 커질 때에만 톡(다음 무리에 다리를 놓거나 특별한 놈을 끼워 준다 — 헛톡은 숫자를 깎는다).
 *  - 순찰·'!'는 눈금이 차기 전에 톡.
 */
export const brawlstartSmart: Bot<BrawlState> = {
  name: '굴려 보고 한 번에 크게 번질 놈',
  act(s) {
    const b = between(s, 0);
    if (b) return b;
    if (s.down || s.cd > 0) return NO;
    let mem = smartMem.get(s);
    if (!mem) smartMem.set(s, (mem = { next: 0 }));
    // 들킬라: '!' 뜬 놈 · 눈금이 차오르는 순찰
    for (const m of s.mons) if (onScreen(s, m) && tappable(m) && (m.st === NOTICE || (m.k === 'guard' && m.wind > WATCH_T * 0.35))) return tapAt(s, m);
    if (s.t < mem.next) return NO;
    // 지금 가장 큰 구름의 톡(= 이어 가야 할 숫자)
    let lead = -1, lc = 0;
    for (const c of s.clouds) if (!c.dead && c.tap > 1 && s.tc[c.tap & 15] > lc) (lc = s.tc[c.tap & 15]), (lead = c.tap & 15);
    const busy = !quiet(s);
    // 싸움을 열 때는 여우가 막힐 때까지 기다린다 (싸움이 아직 덜 끝났으면 그것도 기다린다)
    if (lead < 0 && (busy || !s.blocked)) return (mem.next = s.t + 5), NO;
    const cands: Mon[] = [];
    for (const m of s.mons) if (tappable(m) && onScreen(s, m) && m.k !== 'guard') cands.push(m);
    if (!cands.length) return (mem.next = s.t + 8), NO;
    const H = lead < 0 ? 420 : 260;
    const base = cloneSim(s);
    runSim(base, H);
    const gone = new Set<number>();
    for (const m of base.mons) if (m.st !== INC && m.st !== FLY && m.st !== KO && m.st !== -1) gone.add(m.id);
    // 굴려 볼 놈: 특별한 놈 전부 + 무리마다 한 놈 (가만두면 살아남을 놈만)
    const pool: Mon[] = [], seenG = new Set<number>();
    for (const m of cands) {
      if (!gone.has(m.id)) continue;
      if (SPECIAL[m.k] !== undefined) pool.push(m);
      else if (!seenG.has(m.g)) seenG.add(m.g), pool.push(m);
    }
    if (!pool.length) return (mem.next = s.t + 8), NO;
    pool.sort((p, q) => p.x - q.x || p.id - q.id);
    let best: Mon | null = null, bv = -1e9;
    for (const m of pool.slice(0, 7)) {
      const c = cloneSim(s), cm = c.mons.find((o) => o.id === m.id)!;
      tapMon(c, cm);
      runSim(c, H);
      let v = c.pts - base.pts + (c.hearts - base.hearts) * 3000;
      // 큰 구름이 살아 있을 때는 그 숫자를 늘리는 톡만 (따로 붙인 싸움은 숫자를 못 키운다)
      if (lead >= 0 && c.tk[lead] < base.tk[lead] + 2) v -= 1e6;
      if (v > bv) (bv = v), (best = m);
    }
    if (best && (lead < 0 || bv > 0)) return tapAt(s, best);
    mem.next = s.t + 8;
    return NO;
  },
};

const dumbMem = new WeakMap<object, { next: number; down: boolean; x: number; y: number }>();
/** 못하는 봇: 아무 때나 아무 데나 톡 */
export const brawlstartRandom: Bot<BrawlState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 10 + Math.floor(rng() * 40), down: false, x: 0.5, y: 0.5 }));
    if (s.t >= m.next) {
      m.down = !m.down;
      if (m.down) {
        m.next = s.t + 3 + Math.floor(rng() * 6);
        m.x = 0.03 + rng() * 0.94;
        m.y = 0.12 + rng() * 0.84;
      } else m.next = s.t + 20 + Math.floor(rng() * 90);
    }
    return m.down ? { tap: false, dir: 0, pointer: { x: m.x, y: m.y } } : NO;
  },
};

function habit(s: BrawlState, side: number, pick: (c: Mon[]) => Mon): Input {
  const b = between(s, side);
  if (b) return b;
  if (s.down || s.cd > 0) return NO;
  const c = s.mons.filter((m) => tappable(m) && onScreen(s, m));
  return c.length ? tapAt(s, pick(c)) : NO;
}
/** 버릇 봇: 늘 여우에게 가장 가까운 놈 */
export const brawlstartHabit: Bot<BrawlState> = {
  name: '늘 여우에게 가장 가까운 놈',
  act: (s) => habit(s, 0, (c) => c.reduce((a, m) => (Math.hypot(m.x - s.fx, m.y - FOX_Y) < Math.hypot(a.x - s.fx, a.y - FOX_Y) ? m : a))),
};
/** 독립 버릇 봇: 늘 가장 큰 놈 (같으면 앞쪽) */
export const brawlstartHabit2: Bot<BrawlState> = {
  name: '늘 가장 큰 놈',
  act: (s) => habit(s, 1, (c) => c.reduce((a, m) => (m.r > a.r + 1e-9 || (Math.abs(m.r - a.r) < 1e-9 && m.x > a.x) ? m : a))),
};

// ───────────────────────────── 그리기 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const OUT = '#4a2e1a';
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
function ell(ctx: C2, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
}
/** 채우고(선 굵기가 있으면) 테두리 */
function fs(ctx: C2, fill: string, lw = 0, stroke = OUT) {
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw > 0) (ctx.lineWidth = lw), (ctx.strokeStyle = stroke), ctx.stroke();
}
function rr(ctx: C2, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)));
}
function starPath(ctx: C2, x: number, y: number, r: number, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot - Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r * 0.46 : r;
    ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
}
function heartPath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.5, y - r * 0.2, x - r * 0.7, y - r * 1.2, x, y - r * 0.4);
  ctx.bezierCurveTo(x + r * 0.7, y - r * 1.2, x + r * 1.5, y - r * 0.2, x, y + r * 0.9);
  ctx.closePath();
}
const backOut = (u: number) => {
  const q = clamp(u, 0, 1) - 1;
  return 1 + q * q * (2.7 * q + 1.7);
};
function line(ctx: C2, x0: number, y0: number, x1: number, y1: number, col: string, lw: number) {
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

/** 몸 색: [몸, 배, 포인트] */
const GOB = [['#86dba6', '#d6f6e0', '#3fa66f'], ['#ffba8c', '#ffe7d3', '#e8793f'], ['#c4b2f6', '#ece4ff', '#8a6fdc']];
const TWIN = [['#6fb9ff', '#d9eeff', '#ffd24a'], ['#ff93b6', '#ffe1ea', '#7be0c3'], ['#ffd45c', '#fff3c9', '#ff7b6b']];
const KCOL: Record<K, string[]> = {
  gob: GOB[0], twin: TWIN[0], bear: ['#b98352', '#ecd0a8', '#8a5a34'], rabbit: ['#fff4ef', '#ffffff', '#ffb0bd'], boar: ['#9c6c52', '#c79a82', '#6e4634'],
  cracker: ['#ff6f5e', '#ffd9c9', '#ffd24a'], owl: ['#8fa5cc', '#f4f6ff', '#5c6f9c'], chick: ['#ffe166', '#fff5bf', '#ff9a3c'], wiz: ['#6272dc', '#c9d0ff', '#ffd24a'],
  boss: ['#ef5a4c', '#ffc9b0', '#ffd24a'], guard: ['#6f8fd8', '#dbe6ff', '#34478a'],
};
const BOSSCOL = [['#ef5a4c', '#ffc9b0', '#ffd24a'], ['#6fbf5f', '#e2f5b8', '#8b97a8'], ['#a56fe0', '#ead8ff', '#ffd24a']];
const colOf = (k: K, v: number, ch = 0) => (k === 'gob' ? GOB[v % 3] : k === 'twin' ? TWIN[v % 3] : k === 'boss' ? BOSSCOL[ch % 3] : KCOL[k]);

/** 표정: 0 보통 · 1 어쭈? · 2 화남 · 3 겁먹음 · 4 기절 · 5 잠 · 6 신남 · 7 두리번 · 8 째려봄 · 9 볼 빵빵(호루라기) */
function drawFace(ctx: C2, R: number, ex: number, lx: number, ly: number, t: number, ey: number, ed: number, er: number, my: number, seed: number) {
  const lw = Math.max(1, R * 0.07);
  ctx.lineCap = 'round';
  const blink = ex === 0 && (t + seed * 7) % 190 < 6;
  if (ex === 4) {
    // 뱅글뱅글 눈
    ctx.strokeStyle = OUT;
    ctx.lineWidth = lw;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      for (let i = 0; i <= 10; i++) {
        const a = t * 0.3 * sx + i * 0.9, q = (er * 1.1 * i) / 10;
        ctx.lineTo(sx * ed + Math.cos(a) * q, ey + Math.sin(a) * q);
      }
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-ed * 0.6, my);
    ctx.quadraticCurveTo(-ed * 0.2, my + R * 0.12, 0, my);
    ctx.quadraticCurveTo(ed * 0.3, my - R * 0.1, ed * 0.6, my + R * 0.02);
    ctx.stroke();
    ell(ctx, ed * 0.25, my + R * 0.1, R * 0.09, R * 0.12);
    fs(ctx, '#ff8fa3', lw * 0.7);
    return;
  }
  if (ex === 5 || ex === 6 || blink) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = lw * 1.1;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      if (ex === 6) ctx.arc(sx * ed, ey + er * 0.3, er * 0.75, Math.PI * 1.1, Math.PI * 1.9);
      else ctx.arc(sx * ed, ey - er * 0.2, er * 0.75, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
  } else {
    const big = ex === 3 ? 1.25 : 1, pr = ex === 3 ? 0.3 : ex === 8 ? 0.42 : 0.55;
    for (const sx of [-1, 1]) {
      ell(ctx, sx * ed, ey, er * big, er * big * (ex === 8 || ex === 2 ? 0.8 : 1.08));
      fs(ctx, '#ffffff', lw * 0.8);
      const px = sx * ed + clamp(lx, -1, 1) * er * 0.38 + (ex === 7 ? Math.sin(t * 0.14) * er * 0.4 : 0), py = ey + clamp(ly, -1, 1) * er * 0.3;
      ell(ctx, px, py, er * pr, er * pr);
      fs(ctx, '#2a1a10');
      ell(ctx, px - er * 0.15, py - er * 0.18, er * 0.16, er * 0.16);
      fs(ctx, '#ffffff');
    }
    // 눈썹
    ctx.strokeStyle = OUT;
    ctx.lineWidth = lw * 1.3;
    if (ex === 2 || ex === 8) {
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx * (ed + er * 1.1), ey - er * 1.35);
        ctx.lineTo(sx * (ed - er * 0.9), ey - er * 0.55);
        ctx.stroke();
      }
    } else if (ex === 1) {
      ctx.beginPath();
      ctx.moveTo(-ed - er, ey - er * 1.9);
      ctx.lineTo(-ed + er, ey - er * 1.5);
      ctx.moveTo(ed - er, ey - er * 0.9);
      ctx.lineTo(ed + er, ey - er * 1.25);
      ctx.stroke();
    } else if (ex === 3) {
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx * (ed - er * 0.9), ey - er * 1.9);
        ctx.lineTo(sx * (ed + er * 1.1), ey - er * 1.45);
        ctx.stroke();
      }
    }
  }
  // 입
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw;
  if (ex === 2) {
    rr(ctx, -ed * 0.75, my - R * 0.08, ed * 1.5, R * 0.2, R * 0.05);
    fs(ctx, '#ffffff', lw);
    line(ctx, 0, my - R * 0.08, 0, my + R * 0.12, OUT, lw * 0.7);
    line(ctx, -ed * 0.75, my + R * 0.02, ed * 0.75, my + R * 0.02, OUT, lw * 0.7);
  } else if (ex === 3) {
    ell(ctx, 0, my + R * 0.03, ed * 0.5, R * 0.14 + Math.sin(t * 0.8) * R * 0.02);
    fs(ctx, '#7a2c2c', lw);
  } else if (ex === 6) {
    ctx.beginPath();
    ctx.arc(0, my - R * 0.04, ed * 0.7, 0, Math.PI);
    ctx.closePath();
    fs(ctx, '#a33b3b', lw);
  } else if (ex === 1 || ex === 8) {
    ctx.beginPath();
    ctx.moveTo(-ed * 0.55, my + R * 0.05);
    ctx.lineTo(ed * 0.6, my - R * 0.03);
    ctx.stroke();
  } else if (ex === 5) {
    ell(ctx, 0, my, R * 0.06, R * 0.07);
    fs(ctx, '#7a2c2c', lw * 0.7);
  } else if (ex === 9) {
    for (const sx of [-1, 1]) {
      ell(ctx, sx * ed * 1.5, my - R * 0.02, R * 0.2, R * 0.18);
      fs(ctx, '#ffb0a0', lw * 0.8);
    }
  } else {
    ctx.beginPath();
    ctx.arc(0, my - R * 0.08, ed * 0.55, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }
  if (ex === 1) {
    // 불끈 핏줄
    ctx.strokeStyle = '#e8402f';
    ctx.lineWidth = lw * 1.2;
    const vx = ed * 1.5, vy = ey - er * 2.4, q = R * 0.11;
    ctx.beginPath();
    ctx.moveTo(vx - q, vy - q * 0.3);
    ctx.quadraticCurveTo(vx - q * 0.2, vy - q * 0.2, vx - q * 0.3, vy - q);
    ctx.moveTo(vx + q, vy + q * 0.3);
    ctx.quadraticCurveTo(vx + q * 0.2, vy + q * 0.2, vx + q * 0.3, vy + q);
    ctx.moveTo(vx + q * 0.3, vy - q);
    ctx.quadraticCurveTo(vx + q * 0.2, vy - q * 0.2, vx + q, vy - q * 0.3);
    ctx.moveTo(vx - q * 0.3, vy + q);
    ctx.quadraticCurveTo(vx - q * 0.2, vy + q * 0.2, vx - q, vy + q * 0.3);
    ctx.stroke();
  }
  if (ex === 3) {
    // 식은땀
    ctx.beginPath();
    ctx.moveTo(ed * 1.9, ey - er * 1.6);
    ctx.quadraticCurveTo(ed * 2.4, ey - er * 0.4, ed * 1.9, ey - er * 0.2);
    ctx.quadraticCurveTo(ed * 1.4, ey - er * 0.4, ed * 1.9, ey - er * 1.6);
    fs(ctx, '#8fd6ff', lw * 0.6);
  }
}

interface Pose { ex: number; lx: number; ly: number; t: number; walk: number; seed: number; ch: number; arm: number }
/** 몬스터 하나 — 발 자리가 (0,0), R = 몸 반지름(px). 오른쪽을 보는 그림(왼쪽은 밖에서 뒤집는다) */
function drawMon(ctx: C2, k: K, v: number, R: number, p: Pose) {
  const [c0, c1, c2] = colOf(k, v, p.ch), lw = Math.max(1.2, R * 0.085), t = p.t;
  const step = p.walk ? Math.sin(t * 0.42 + p.seed) : 0, bob = p.walk ? Math.abs(step) * R * 0.1 : Math.sin(t * 0.07 + p.seed) * R * 0.025;
  ctx.lineJoin = 'round';
  if (k === 'boar') {
    // 낮잠 멧돼지: 옆으로 길쭉한 몸
    const up = p.ex === 5 ? 0 : R * 0.12, by = -R * 0.62 - up;
    for (const fx of [-0.55, 0.5]) {
      ell(ctx, fx * R, -R * 0.1, R * 0.2, R * 0.14);
      fs(ctx, c2, lw);
    }
    ell(ctx, -R * 1.05, by - R * 0.1, R * 0.16, R * 0.1, -0.6);
    fs(ctx, c2, lw);
    ell(ctx, 0, by, R * 1.12, R * 0.72 + (p.ex === 5 ? Math.sin(t * 0.06) * R * 0.04 : 0));
    fs(ctx, c0, lw);
    // 등 갈기
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const x0 = -R * 0.55 + i * R * 0.24;
      ctx.moveTo(x0, by - R * 0.66);
      ctx.lineTo(x0 + R * 0.1, by - R * 0.95);
      ctx.lineTo(x0 + R * 0.22, by - R * 0.64);
    }
    fs(ctx, c2, lw * 0.8);
    ell(ctx, R * 0.25, by - R * 0.62, R * 0.2, R * 0.26, 0.4);
    fs(ctx, c0, lw);
    // 주둥이·엄니
    ell(ctx, R * 0.95, by + R * 0.12, R * 0.34, R * 0.3);
    fs(ctx, c1, lw);
    for (const sy of [-1, 1]) {
      ell(ctx, R * 1.06, by + R * 0.12 + sy * R * 0.09, R * 0.05, R * 0.07);
      fs(ctx, c2);
    }
    ctx.beginPath();
    ctx.moveTo(R * 0.72, by + R * 0.34);
    ctx.quadraticCurveTo(R * 0.8, by + R * 0.02, R * 0.92, by - R * 0.12);
    ctx.lineTo(R * 0.86, by + R * 0.36);
    ctx.closePath();
    fs(ctx, '#fffbe8', lw * 0.7);
    ctx.save();
    ctx.translate(R * 0.42, by - R * 0.1);
    drawFace(ctx, R * 0.8, p.ex, p.lx, p.ly, t, 0, R * 0.2, R * 0.13, R * 5, p.seed);
    ctx.restore();
    return;
  }
  const big = k === 'bear' || k === 'boss', H = k === 'chick' ? 0.92 : k === 'rabbit' ? 1.0 : big ? 1.08 : 1.02;
  const cy = -R * H - bob, rx = R * (k === 'bear' ? 1.05 : 1), ry = R * H;
  // ── 몸 뒤에 붙는 것: 귀·꼬리·날개·짐 ──
  if (k === 'bear') {
    for (const sx of [-1, 1]) {
      ell(ctx, sx * R * 0.68, cy - R * 0.86, R * 0.3, R * 0.3);
      fs(ctx, c0, lw);
      ell(ctx, sx * R * 0.68, cy - R * 0.84, R * 0.14, R * 0.14);
      fs(ctx, c2);
    }
  } else if (k === 'rabbit') {
    const tw = p.ex === 3 ? Math.sin(t * 1.3) * 0.12 : Math.sin(t * 0.05 + p.seed) * 0.05;
    for (const sx of [-1, 1]) {
      ell(ctx, sx * R * 0.34, cy - R * 1.4, R * 0.22, R * 0.62, sx * 0.14 + tw);
      fs(ctx, c0, lw);
      ell(ctx, sx * R * 0.34, cy - R * 1.36, R * 0.1, R * 0.42, sx * 0.14 + tw);
      fs(ctx, c2);
    }
    ell(ctx, -R * 0.95, cy + R * 0.35, R * 0.22, R * 0.22);
    fs(ctx, '#ffffff', lw);
  } else if (k === 'gob' || k === 'twin' || k === 'guard') {
    // 뾰족 귀
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * R * 0.78, cy - R * 0.45);
      ctx.lineTo(sx * R * 1.45, cy - R * 0.62);
      ctx.lineTo(sx * R * 0.9, cy + R * 0.02);
      ctx.closePath();
      fs(ctx, c0, lw);
    }
  } else if (k === 'cracker') {
    // 등에 진 폭죽
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(-R * 0.75 - i * R * 0.12, cy - R * 0.2);
      ctx.rotate(-0.5 - i * 0.28);
      rr(ctx, -R * 0.12, -R * 1.25, R * 0.24, R * 0.9, R * 0.06);
      fs(ctx, ['#ffd24a', '#7be0c3', '#ff93b6'][i], lw * 0.8);
      ctx.beginPath();
      ctx.moveTo(-R * 0.16, -R * 1.25);
      ctx.lineTo(0, -R * 1.6);
      ctx.lineTo(R * 0.16, -R * 1.25);
      ctx.closePath();
      fs(ctx, '#ff6f5e', lw * 0.8);
      ctx.restore();
    }
  } else if (k === 'owl') {
    for (const sx of [-1, 1]) {
      ell(ctx, sx * R * 0.95, cy + R * 0.1, R * 0.26, R * 0.6, sx * (0.25 + (p.ex === 9 ? Math.sin(t * 0.9) * 0.25 : 0)));
      fs(ctx, c2, lw);
    }
  } else if (k === 'chick') {
    for (const sx of [-1, 1]) {
      ell(ctx, sx * R * 0.92, cy + R * 0.12, R * 0.2, R * 0.36, sx * (0.5 + (p.ex === 6 ? Math.sin(t * 0.8 + sx) * 0.5 : 0)));
      fs(ctx, c0, lw);
    }
  } else if (k === 'boss') {
    if (p.ch === 2) {
      // 용 날개
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx * R * 0.7, cy - R * 0.3);
        ctx.lineTo(sx * R * 1.75, cy - R * 1.15 + Math.sin(t * 0.1) * R * 0.08);
        ctx.lineTo(sx * R * 1.55, cy - R * 0.45);
        ctx.lineTo(sx * R * 1.8, cy - R * 0.1);
        ctx.lineTo(sx * R * 0.8, cy + R * 0.2);
        ctx.closePath();
        fs(ctx, '#7d4fc0', lw);
      }
    }
    // 뿔
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * R * 0.42, cy - R * 0.92);
      ctx.quadraticCurveTo(sx * R * 0.95, cy - R * 1.25, sx * R * 0.88, cy - R * 1.72);
      ctx.quadraticCurveTo(sx * R * 0.55, cy - R * 1.3, sx * R * 0.2, cy - R * 1.0);
      ctx.closePath();
      fs(ctx, p.ch === 1 ? '#8b97a8' : '#fff3d0', lw);
    }
  }
  // ── 발 ──
  const fcol = k === 'chick' || k === 'owl' ? '#ff9a3c' : k === 'rabbit' ? '#ffd9df' : c2;
  if (k !== 'wiz') {
    for (const sx of [-1, 1]) {
      ell(ctx, sx * R * 0.42 + (p.walk ? sx * step * R * 0.16 : 0), -R * 0.1 - (p.walk ? Math.max(0, sx * step) * R * 0.14 : 0), R * 0.27, R * 0.16);
      fs(ctx, fcol, lw);
    }
  }
  // ── 몸 ──
  if (k === 'wiz') {
    // 로브: 아래가 넓은 종 모양 (둥실 떠 있다)
    const fl = Math.sin(t * 0.08 + p.seed) * R * 0.06;
    ctx.beginPath();
    ctx.moveTo(-R * 0.62, cy - R * 0.5 + fl);
    ctx.quadraticCurveTo(-R * 1.15, -R * 0.2 + fl, -R * 0.95, fl - R * 0.1);
    ctx.quadraticCurveTo(0, R * 0.12 + fl, R * 0.95, fl - R * 0.1);
    ctx.quadraticCurveTo(R * 1.15, -R * 0.2 + fl, R * 0.62, cy - R * 0.5 + fl);
    ctx.closePath();
    fs(ctx, c0, lw);
    ell(ctx, 0, cy - R * 0.2 + fl, R * 0.72, R * 0.68);
    fs(ctx, '#ffe3c4', lw);
    // 수염
    ctx.beginPath();
    ctx.moveTo(-R * 0.6, cy + R * 0.05 + fl);
    ctx.quadraticCurveTo(0, cy + R * 1.25 + fl, R * 0.6, cy + R * 0.05 + fl);
    ctx.quadraticCurveTo(0, cy + R * 0.3 + fl, -R * 0.6, cy + R * 0.05 + fl);
    fs(ctx, '#ffffff', lw);
    ctx.save();
    ctx.translate(0, cy - R * 0.25 + fl);
    drawFace(ctx, R, p.ex, p.lx, p.ly, t, 0, R * 0.28, R * 0.15, R * 5, p.seed);
    ctx.restore();
    // 모자
    ctx.beginPath();
    ctx.moveTo(-R * 0.95, cy - R * 0.62 + fl);
    ctx.quadraticCurveTo(0, cy - R * 0.95 + fl, R * 0.95, cy - R * 0.62 + fl);
    ctx.lineTo(R * 0.5, cy - R * 0.78 + fl);
    ctx.quadraticCurveTo(R * 0.3, cy - R * 1.7 + fl, -R * 0.35, cy - R * 2.0 + fl + Math.sin(t * 0.1) * R * 0.05);
    ctx.quadraticCurveTo(-R * 0.2, cy - R * 1.4 + fl, -R * 0.5, cy - R * 0.78 + fl);
    ctx.closePath();
    fs(ctx, c0, lw);
    starPath(ctx, R * 0.02, cy - R * 1.15 + fl, R * 0.2, t * 0.03);
    fs(ctx, c2, lw * 0.6);
    // 회오리 지팡이
    line(ctx, R * 1.05, cy + R * 0.7 + fl, R * 1.05, cy - R * 0.9 + fl, '#8a5a34', lw * 1.6);
    ctx.strokeStyle = '#9fe8ff';
    ctx.lineWidth = lw * 1.2;
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const a = t * 0.2 + i * 0.7, q = (R * 0.3 * i) / 12;
      ctx.lineTo(R * 1.05 + Math.cos(a) * q, cy - R * 1.1 + fl + Math.sin(a) * q);
    }
    ctx.stroke();
    return;
  }
  ell(ctx, 0, cy, rx, ry);
  fs(ctx, c0, lw);
  // 배
  if (k === 'owl') {
    // 심판 줄무늬 배
    ctx.save();
    ell(ctx, 0, cy + R * 0.3, R * 0.62, R * 0.62);
    ctx.clip();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-R, cy - R * 0.4, R * 2, R * 1.5);
    ctx.fillStyle = '#2f2a33';
    for (let i = -2; i <= 2; i++) ctx.fillRect(i * R * 0.3 - R * 0.07, cy - R * 0.4, R * 0.14, R * 1.5);
    ctx.restore();
    ell(ctx, 0, cy + R * 0.3, R * 0.62, R * 0.62);
    ctx.lineWidth = lw * 0.8;
    ctx.strokeStyle = OUT;
    ctx.stroke();
  } else {
    ell(ctx, 0, cy + R * 0.34, rx * 0.62, ry * 0.52);
    fs(ctx, c1);
  }
  if (k === 'gob' || k === 'twin' || k === 'guard') {
    // 줄무늬 바지
    ctx.save();
    ell(ctx, 0, cy, rx, ry);
    ctx.clip();
    ctx.fillStyle = c2;
    ctx.fillRect(-R * 1.1, cy + R * 0.52, R * 2.2, R * 0.7);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.fillRect(-R * 1.1, cy + R * 0.66, R * 2.2, R * 0.1);
    ctx.restore();
    ell(ctx, 0, cy, rx, ry);
    ctx.lineWidth = lw;
    ctx.strokeStyle = OUT;
    ctx.stroke();
  }
  // 팔 (arm: 0 내림 · 1 주먹 쥐고 올림 · 2 만세)
  const ay = p.arm === 2 ? cy - R * 0.5 : p.arm === 1 ? cy - R * 0.15 : cy + R * 0.28;
  if (k !== 'owl' && k !== 'chick') {
    for (const sx of [-1, 1]) {
      const raise = p.arm === 1 && sx === 1 ? R * 0.35 : 0;
      ell(ctx, sx * (rx + R * 0.02) + (raise ? R * 0.2 : 0), ay - raise + (p.walk ? sx * step * R * 0.08 : 0), R * 0.2, R * 0.2);
      fs(ctx, c0, lw);
    }
  }
  // ── 얼굴 ──
  const fy = k === 'chick' ? cy - R * 0.12 : cy - R * 0.24, ed = R * (big ? 0.34 : 0.36), er = R * (k === 'chick' ? 0.2 : big ? 0.17 : 0.2);
  if (k === 'owl') {
    for (const sx of [-1, 1]) {
      ell(ctx, sx * R * 0.38, fy, R * 0.42, R * 0.42);
      fs(ctx, c1, lw * 0.7);
    }
  }
  ctx.save();
  ctx.translate(R * 0.08, fy);
  drawFace(ctx, R, p.ex, p.lx, p.ly, t, 0, ed, er, k === 'owl' || k === 'chick' ? R * 5 : R * 0.42, p.seed);
  ctx.restore();
  // 볼터치
  if (p.ex !== 4 && k !== 'owl') {
    ctx.fillStyle = 'rgba(255,120,120,.32)';
    for (const sx of [-1, 1]) {
      ell(ctx, sx * R * 0.66 + R * 0.08, fy + R * 0.26, R * 0.16, R * 0.1);
      ctx.fill();
    }
  }
  // ── 몸 앞에 붙는 것: 뿔·부리·모자·왕관 ──
  if (k === 'gob') {
    ctx.beginPath();
    ctx.moveTo(-R * 0.2, cy - R * 0.92);
    ctx.quadraticCurveTo(R * 0.02, cy - R * 1.55, R * 0.28, cy - R * 1.38);
    ctx.quadraticCurveTo(R * 0.1, cy - R * 1.15, R * 0.26, cy - R * 0.9);
    ctx.closePath();
    fs(ctx, '#fff3d0', lw);
    if (p.ex !== 4 && p.ex !== 2 && p.ex !== 3) {
      ctx.beginPath();
      ctx.moveTo(R * 0.24, fy + R * 0.36);
      ctx.lineTo(R * 0.32, fy + R * 0.56);
      ctx.lineTo(R * 0.42, fy + R * 0.36);
      fs(ctx, '#ffffff', lw * 0.6);
    }
  } else if (k === 'guard') {
    // 순찰 모자 · 등불
    ctx.beginPath();
    ctx.moveTo(-R * 0.82, cy - R * 0.62);
    ctx.quadraticCurveTo(-R * 0.7, cy - R * 1.42, 0, cy - R * 1.4);
    ctx.quadraticCurveTo(R * 0.7, cy - R * 1.42, R * 0.82, cy - R * 0.62);
    ctx.quadraticCurveTo(0, cy - R * 0.86, -R * 0.82, cy - R * 0.62);
    fs(ctx, c2, lw);
    ctx.beginPath();
    ctx.moveTo(R * 0.1, cy - R * 0.74);
    ctx.quadraticCurveTo(R * 0.8, cy - R * 0.86, R * 1.2, cy - R * 0.5);
    ctx.quadraticCurveTo(R * 0.7, cy - R * 0.56, R * 0.1, cy - R * 0.56);
    ctx.closePath();
    fs(ctx, '#232f63', lw * 0.8);
    starPath(ctx, R * 0.05, cy - R * 1.05, R * 0.2, 0);
    fs(ctx, '#ffd24a', lw * 0.6);
    line(ctx, R * 1.12, cy + R * 0.02, R * 1.12, cy + R * 0.3, OUT, lw * 0.9);
    ctx.fillStyle = `rgba(255,236,150,${0.28 + 0.12 * Math.sin(t * 0.2)})`;
    ell(ctx, R * 1.12, cy + R * 0.5, R * 0.5, R * 0.5);
    ctx.fill();
    rr(ctx, R * 0.95, cy + R * 0.3, R * 0.34, R * 0.4, R * 0.08);
    fs(ctx, '#ffe680', lw * 0.8);
  } else if (k === 'twin') {
    // 별 머리띠
    ctx.strokeStyle = c2;
    ctx.lineWidth = R * 0.16;
    ctx.beginPath();
    ctx.arc(0, cy, rx * 0.98, Math.PI * 1.18, Math.PI * 1.82);
    ctx.stroke();
    starPath(ctx, 0, cy - R * 1.02, R * 0.3, Math.sin(t * 0.08 + p.seed) * 0.2);
    fs(ctx, '#ffe45c', lw * 0.8);
  } else if (k === 'bear') {
    ell(ctx, R * 0.08, fy + R * 0.3, R * 0.3, R * 0.22);
    fs(ctx, c1, lw * 0.7);
    ell(ctx, R * 0.08, fy + R * 0.2, R * 0.11, R * 0.08);
    fs(ctx, '#3a241a');
  } else if (k === 'rabbit') {
    rr(ctx, R * 0.0, fy + R * 0.4, R * 0.18, R * 0.16, R * 0.03);
    fs(ctx, '#ffffff', lw * 0.6);
    ell(ctx, R * 0.08, fy + R * 0.28, R * 0.07, R * 0.05);
    fs(ctx, '#ff8fa3');
  } else if (k === 'cracker') {
    // 고깔 모자
    ctx.beginPath();
    ctx.moveTo(-R * 0.7, cy - R * 0.72);
    ctx.lineTo(R * 0.05, cy - R * 1.85);
    ctx.lineTo(R * 0.72, cy - R * 0.7);
    ctx.quadraticCurveTo(0, cy - R * 1.02, -R * 0.7, cy - R * 0.72);
    fs(ctx, c2, lw);
    ell(ctx, R * 0.05, cy - R * 1.86, R * 0.16, R * 0.16);
    fs(ctx, '#ffffff', lw * 0.7);
    ctx.fillStyle = '#ff6f5e';
    for (const [qx, qy] of [[-0.25, -1.0], [0.2, -1.25], [0.3, -0.9]]) {
      ell(ctx, R * qx, cy + R * qy, R * 0.08, R * 0.08);
      ctx.fill();
    }
  } else if (k === 'owl') {
    ctx.beginPath();
    ctx.moveTo(-R * 0.06, fy + R * 0.12);
    ctx.lineTo(R * 0.12, fy + R * 0.42);
    ctx.lineTo(R * 0.3, fy + R * 0.12);
    ctx.closePath();
    fs(ctx, '#ff9a3c', lw * 0.7);
    // 귀깃
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * R * 0.4, cy - R * 0.9);
      ctx.lineTo(sx * R * 0.85, cy - R * 1.3);
      ctx.lineTo(sx * R * 0.8, cy - R * 0.62);
      ctx.closePath();
      fs(ctx, c2, lw * 0.8);
    }
    // 호루라기
    const wy = p.ex === 9 ? fy + R * 0.42 : cy + R * 0.42;
    if (p.ex !== 9) line(ctx, -R * 0.3, cy + R * 0.02, R * 0.12, wy, '#ff6f5e', lw * 0.7), line(ctx, R * 0.5, cy + R * 0.02, R * 0.12, wy, '#ff6f5e', lw * 0.7);
    rr(ctx, R * 0.0, wy - R * 0.1, R * 0.34, R * 0.2, R * 0.08);
    fs(ctx, '#ffd24a', lw * 0.7);
  } else if (k === 'chick') {
    ctx.beginPath();
    ctx.moveTo(R * 0.1, fy + R * 0.2);
    ctx.lineTo(R * 0.52, fy + R * 0.32);
    ctx.lineTo(R * 0.1, fy + R * 0.46);
    ctx.closePath();
    fs(ctx, '#ff9a3c', lw * 0.8);
    // 머리 깃
    ctx.strokeStyle = OUT;
    ctx.lineWidth = lw * 0.9;
    ctx.beginPath();
    ctx.moveTo(-R * 0.05, cy - R * 0.9);
    ctx.quadraticCurveTo(-R * 0.25, cy - R * 1.3, R * 0.1, cy - R * 1.28);
    ctx.stroke();
  } else if (k === 'boss') {
    if (p.ch === 1) {
      // 철모
      ctx.beginPath();
      ctx.arc(0, cy - R * 0.5, rx * 0.86, Math.PI, 0);
      ctx.lineTo(rx * 0.98, cy - R * 0.42);
      ctx.lineTo(-rx * 0.98, cy - R * 0.42);
      ctx.closePath();
      fs(ctx, '#aab5c4', lw);
      ctx.beginPath();
      ctx.moveTo(-R * 0.12, cy - R * 1.32);
      ctx.lineTo(0, cy - R * 1.75);
      ctx.lineTo(R * 0.12, cy - R * 1.32);
      fs(ctx, '#ffd24a', lw * 0.8);
    } else {
      // 왕관
      ctx.beginPath();
      ctx.moveTo(-R * 0.5, cy - R * 0.92);
      ctx.lineTo(-R * 0.58, cy - R * 1.5);
      ctx.lineTo(-R * 0.25, cy - R * 1.2);
      ctx.lineTo(0, cy - R * 1.62);
      ctx.lineTo(R * 0.25, cy - R * 1.2);
      ctx.lineTo(R * 0.58, cy - R * 1.5);
      ctx.lineTo(R * 0.5, cy - R * 0.92);
      ctx.closePath();
      fs(ctx, '#ffd24a', lw);
      ell(ctx, 0, cy - R * 1.12, R * 0.09, R * 0.09);
      fs(ctx, '#ff6f5e', lw * 0.5);
    }
    // 큰 입 · 송곳니
    if (p.ex !== 4 && p.ex !== 2) {
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx * R * 0.3 + R * 0.08 - R * 0.07, fy + R * 0.42);
        ctx.lineTo(sx * R * 0.3 + R * 0.08, fy + R * 0.2);
        ctx.lineTo(sx * R * 0.3 + R * 0.08 + R * 0.07, fy + R * 0.42);
        fs(ctx, '#ffffff', lw * 0.6);
      }
    }
  }
}

/** 꼬마 여우 — 발 자리가 (0,0), H = 키(px). pose: 0 살금살금 · 1 달리기 · 2 숨기 · 3 킥킥 · 4 들킬라! · 5 꿀밤 · 6 만세 */
function drawFox(ctx: C2, H: number, pose: number, t: number, lv: number, perkA: number, perkB: number) {
  const lw = Math.max(1.4, H * 0.028), F = '#ff9a3c', F2 = '#ffe9cf', D = '#6b3a1c';
  const run = pose === 1, walk = pose === 0, sw = run ? Math.sin(t * 0.55) : walk ? Math.sin(t * 0.3) : 0;
  const duck = pose === 2 ? H * 0.16 : pose === 5 ? H * 0.2 : 0, hop = pose === 6 ? Math.abs(Math.sin(t * 0.22)) * H * 0.14 : pose === 3 ? Math.abs(Math.sin(t * 0.5)) * H * 0.03 : 0;
  const lean = run ? 0.2 : pose === 4 ? -0.12 : 0;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.save();
  ctx.translate(0, -hop);
  ctx.rotate(lean);
  // 꼬리
  ctx.save();
  ctx.translate(-H * 0.16, -H * 0.2 + duck * 0.5);
  ctx.rotate(-0.5 + (run ? -0.5 : 0) + Math.sin(t * (pose === 3 ? 0.5 : 0.12)) * 0.16 + (pose === 4 ? 0.5 : 0));
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-H * 0.34, -H * 0.02, -H * 0.42, -H * 0.3);
  ctx.quadraticCurveTo(-H * 0.2, -H * 0.42, 0, -H * 0.1);
  ctx.closePath();
  fs(ctx, F, lw);
  ctx.beginPath();
  ctx.moveTo(-H * 0.32, -H * 0.16);
  ctx.quadraticCurveTo(-H * 0.4, -H * 0.22, -H * 0.42, -H * 0.3);
  ctx.quadraticCurveTo(-H * 0.3, -H * 0.36, -H * 0.22, -H * 0.3);
  ctx.closePath();
  fs(ctx, F2, lw * 0.7);
  ctx.restore();
  // 다리
  for (const sx of [-1, 1]) {
    const q = sx * sw;
    ell(ctx, sx * H * 0.075 + q * H * 0.07, -H * 0.03 - Math.max(0, q) * H * 0.05, H * 0.075, H * 0.045);
    fs(ctx, D, lw);
  }
  // 몸
  const by = -H * 0.24 + duck * 0.6;
  ell(ctx, 0, by, H * 0.15, H * 0.17);
  fs(ctx, F, lw);
  ell(ctx, H * 0.02, by + H * 0.03, H * 0.09, H * 0.11);
  fs(ctx, F2);
  // 장난 레벨 차림: 목도리
  if (lv >= 2) {
    ctx.beginPath();
    ctx.ellipse(0, by - H * 0.13, H * 0.13, H * 0.05, 0, 0, TAU);
    fs(ctx, lv >= 8 ? '#a56fe0' : '#ff5a5a', lw * 0.8);
    ctx.beginPath();
    ctx.moveTo(-H * 0.1, by - H * 0.12);
    ctx.quadraticCurveTo(-H * 0.24, by - H * 0.08 + Math.sin(t * 0.2) * H * 0.02, -H * 0.26, by + H * 0.02 + Math.sin(t * 0.25) * H * 0.02);
    ctx.lineTo(-H * 0.18, by + H * 0.0);
    ctx.closePath();
    fs(ctx, lv >= 8 ? '#a56fe0' : '#ff5a5a', lw * 0.8);
  }
  // 등에 멘 장 끝 물건
  if (perkA === 1) {
    ctx.save();
    ctx.translate(-H * 0.1, by - H * 0.05);
    ctx.rotate(-0.6);
    line(ctx, 0, 0, 0, -H * 0.3, '#c98a4b', lw * 1.8);
    rr(ctx, -H * 0.1, -H * 0.4, H * 0.2, H * 0.12, H * 0.03);
    fs(ctx, '#ff6f5e', lw * 0.8);
    rr(ctx, -H * 0.12, -H * 0.4, H * 0.04, H * 0.12, H * 0.01);
    fs(ctx, '#ffd24a', lw * 0.6);
    rr(ctx, H * 0.08, -H * 0.4, H * 0.04, H * 0.12, H * 0.01);
    fs(ctx, '#ffd24a', lw * 0.6);
    ctx.restore();
  } else if (perkA === 2) {
    ell(ctx, -H * 0.15, by + H * 0.03, H * 0.06, H * 0.07);
    fs(ctx, '#e8402f', lw * 0.8);
    line(ctx, -H * 0.15, by - H * 0.04, -H * 0.13, by - H * 0.08, '#4d9a4a', lw * 1.2);
  }
  if (perkB === 1) {
    ctx.save();
    ctx.translate(-H * 0.2, by - H * 0.2);
    for (let i = 0; i < 3; i++) {
      ell(ctx, 0, i * H * 0.04, H * (0.045 + i * 0.012), H * 0.028);
      fs(ctx, i % 2 ? '#ffc93c' : '#ffb01f', lw * 0.6);
    }
    ctx.restore();
  } else if (perkB === 2) {
    ctx.beginPath();
    ctx.moveTo(-H * 0.14, by - H * 0.1);
    ctx.lineTo(-H * 0.3, by - H * 0.2);
    ctx.lineTo(-H * 0.3, by + H * 0.02);
    ctx.closePath();
    fs(ctx, '#7bb7ff', lw * 0.8);
  }
  // 팔
  const armY = by - H * 0.03;
  if (pose === 6) {
    for (const sx of [-1, 1]) {
      line(ctx, sx * H * 0.11, armY - H * 0.04, sx * H * 0.2, armY - H * 0.2, OUT, lw * 3.6);
      line(ctx, sx * H * 0.11, armY - H * 0.04, sx * H * 0.2, armY - H * 0.2, F, lw * 2.2);
    }
  } else if (pose === 3) {
    line(ctx, H * 0.1, armY, H * 0.13, armY - H * 0.14, OUT, lw * 3.6);
    line(ctx, H * 0.1, armY, H * 0.13, armY - H * 0.14, F, lw * 2.2);
  } else if (pose !== 2 && pose !== 5) {
    // 살금살금 앞으로 모은 손
    for (const k of [0, 1]) {
      const ax = H * 0.12 + k * H * 0.02, ay2 = armY + k * H * 0.03 + (walk ? Math.sin(t * 0.3 + k * 2) * H * 0.012 : run ? Math.sin(t * 0.55 + k * 3) * H * 0.04 : 0);
      line(ctx, H * 0.08, armY, ax + H * 0.06, ay2 - H * 0.02, OUT, lw * 3.4);
      line(ctx, H * 0.08, armY, ax + H * 0.06, ay2 - H * 0.02, F, lw * 2);
    }
  }
  // 머리
  const hx = H * 0.03, hy = -H * 0.56 + duck + (walk ? Math.abs(sw) * H * 0.012 : 0), hr = H * 0.215;
  // 귀
  for (const sx of [-1, 1]) {
    const fl = pose === 4 ? -0.25 * sx : pose === 5 ? 0.6 * sx : Math.sin(t * 0.06 + sx) * 0.05;
    ctx.save();
    ctx.translate(hx + sx * hr * 0.62, hy - hr * 0.62);
    ctx.rotate(sx * 0.32 + fl);
    ctx.beginPath();
    ctx.moveTo(-hr * 0.42, hr * 0.2);
    ctx.quadraticCurveTo(-hr * 0.1, -hr * 0.95, hr * 0.06, -hr * 1.0);
    ctx.quadraticCurveTo(hr * 0.4, -hr * 0.4, hr * 0.42, hr * 0.2);
    ctx.closePath();
    fs(ctx, F, lw);
    ctx.beginPath();
    ctx.moveTo(-hr * 0.2, hr * 0.1);
    ctx.quadraticCurveTo(-hr * 0.02, -hr * 0.62, hr * 0.05, -hr * 0.66);
    ctx.quadraticCurveTo(hr * 0.22, -hr * 0.3, hr * 0.22, hr * 0.1);
    ctx.closePath();
    fs(ctx, D);
    ctx.restore();
  }
  // 얼굴 (볼이 넓은 마름모꼴)
  ctx.beginPath();
  ctx.moveTo(hx, hy - hr);
  ctx.bezierCurveTo(hx + hr * 0.95, hy - hr, hx + hr * 1.45, hy + hr * 0.25, hx + hr * 1.15, hy + hr * 0.5);
  ctx.bezierCurveTo(hx + hr * 0.7, hy + hr * 0.95, hx + hr * 0.3, hy + hr * 0.98, hx + hr * 0.1, hy + hr * 0.98);
  ctx.bezierCurveTo(hx - hr * 0.3, hy + hr * 0.98, hx - hr * 0.7, hy + hr * 0.95, hx - hr * 1.0, hy + hr * 0.5);
  ctx.bezierCurveTo(hx - hr * 1.3, hy + hr * 0.25, hx - hr * 0.95, hy - hr, hx, hy - hr);
  ctx.closePath();
  fs(ctx, F, lw);
  // 흰 볼
  ctx.save();
  ctx.clip();
  ell(ctx, hx - hr * 0.78, hy + hr * 0.62, hr * 0.7, hr * 0.55);
  fs(ctx, F2);
  ell(ctx, hx + hr * 0.95, hy + hr * 0.62, hr * 0.75, hr * 0.55);
  fs(ctx, F2);
  ctx.restore();
  const eyY = hy + hr * 0.08, eL = hx - hr * 0.3, eR = hx + hr * 0.58, er = hr * 0.2;
  // 복면 (레벨 5~): 눈 둘레 띠
  if (lv >= 5) {
    ctx.beginPath();
    ctx.moveTo(hx - hr * 0.98, eyY - er * 1.1);
    ctx.quadraticCurveTo(hx + hr * 0.2, eyY - er * 1.9, hx + hr * 1.28, eyY - er * 0.9);
    ctx.lineTo(hx + hr * 1.22, eyY + er * 1.3);
    ctx.quadraticCurveTo(hx + hr * 0.15, eyY + er * 2.0, hx - hr * 1.02, eyY + er * 1.4);
    ctx.closePath();
    fs(ctx, '#4a3a6a', lw * 0.8);
  }
  // 눈
  if (pose === 3 || pose === 6) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = lw * 1.2;
    for (const ex of [eL, eR]) {
      ctx.beginPath();
      ctx.arc(ex, eyY + er * 0.4, er * 0.85, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  } else if (pose === 5) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = lw * 1.1;
    for (const ex of [eL, eR]) {
      ctx.beginPath();
      ctx.moveTo(ex - er * 0.7, eyY - er * 0.7);
      ctx.lineTo(ex + er * 0.7, eyY + er * 0.7);
      ctx.moveTo(ex + er * 0.7, eyY - er * 0.7);
      ctx.lineTo(ex - er * 0.7, eyY + er * 0.7);
      ctx.stroke();
    }
  } else {
    const wide = pose === 4 ? 1.25 : 1, blink = (t % 170) < 5 && pose !== 4;
    for (const ex of [eL, eR]) {
      if (blink) {
        line(ctx, ex - er * 0.8, eyY, ex + er * 0.8, eyY, OUT, lw * 1.1);
        continue;
      }
      ell(ctx, ex, eyY, er * wide, er * 1.2 * wide);
      fs(ctx, '#ffffff', lw * 0.7);
      ell(ctx, ex + er * 0.3, eyY + (pose === 2 ? -er * 0.1 : er * 0.05), er * (pose === 4 ? 0.36 : 0.6), er * (pose === 4 ? 0.36 : 0.72));
      fs(ctx, '#2a1a10');
      ell(ctx, ex + er * 0.12, eyY - er * 0.3, er * 0.2, er * 0.2);
      fs(ctx, '#ffffff');
    }
    // 장난꾸러기 눈썹
    ctx.strokeStyle = OUT;
    ctx.lineWidth = lw * 1.1;
    ctx.beginPath();
    if (pose === 4) {
      ctx.moveTo(eL - er, eyY - er * 2.1);
      ctx.lineTo(eL + er * 0.8, eyY - er * 2.4);
      ctx.moveTo(eR - er * 0.8, eyY - er * 2.4);
      ctx.lineTo(eR + er, eyY - er * 2.1);
    } else {
      ctx.moveTo(eL - er, eyY - er * 2.1);
      ctx.lineTo(eL + er * 0.9, eyY - er * 1.6);
      ctx.moveTo(eR - er * 0.9, eyY - er * 1.6);
      ctx.lineTo(eR + er, eyY - er * 2.1);
    }
    ctx.stroke();
  }
  // 코·입
  const nx = hx + hr * 1.12, ny = hy + hr * 0.42;
  ell(ctx, nx, ny, hr * 0.13, hr * 0.1);
  fs(ctx, '#2a1a10');
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw;
  if (pose === 3 || pose === 6) {
    ctx.beginPath();
    ctx.arc(hx + hr * 0.5, ny + hr * 0.12, hr * 0.3, 0.1, Math.PI * 0.9);
    ctx.closePath();
    fs(ctx, '#a33b3b', lw);
  } else if (pose === 4 || pose === 5) {
    ell(ctx, hx + hr * 0.55, ny + hr * 0.3, hr * 0.12, hr * 0.15);
    fs(ctx, '#7a2c2c', lw * 0.8);
  } else {
    // 씨익
    ctx.beginPath();
    ctx.moveTo(hx + hr * 0.2, ny + hr * 0.22);
    ctx.quadraticCurveTo(hx + hr * 0.6, ny + hr * 0.52, hx + hr * 1.0, ny + hr * 0.16);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hx + hr * 0.72, ny + hr * 0.33);
    ctx.lineTo(hx + hr * 0.78, ny + hr * 0.48);
    ctx.lineTo(hx + hr * 0.86, ny + hr * 0.3);
    fs(ctx, '#ffffff', lw * 0.6);
  }
  // 볼터치
  ctx.fillStyle = 'rgba(255,110,110,.35)';
  ell(ctx, hx - hr * 0.55, hy + hr * 0.48, hr * 0.18, hr * 0.11);
  ctx.fill();
  // 왕관 (레벨 10~)
  if (lv >= 10) {
    ctx.beginPath();
    ctx.moveTo(hx - hr * 0.4, hy - hr * 0.92);
    ctx.lineTo(hx - hr * 0.46, hy - hr * 1.4);
    ctx.lineTo(hx - hr * 0.18, hy - hr * 1.16);
    ctx.lineTo(hx + hr * 0.02, hy - hr * 1.5);
    ctx.lineTo(hx + hr * 0.22, hy - hr * 1.16);
    ctx.lineTo(hx + hr * 0.5, hy - hr * 1.4);
    ctx.lineTo(hx + hr * 0.44, hy - hr * 0.92);
    ctx.closePath();
    fs(ctx, '#ffd24a', lw * 0.8);
  }
  if (pose === 3) {
    // 입 가린 손
    ell(ctx, hx + hr * 0.62, ny + hr * 0.3, hr * 0.22, hr * 0.18);
    fs(ctx, F, lw);
  }
  if (pose === 5) {
    // 혹
    ell(ctx, hx - hr * 0.1, hy - hr * 1.02, hr * 0.26, hr * 0.22);
    fs(ctx, '#ff8f7a', lw * 0.8);
  }
  ctx.restore();
}

/** 여우가 숨는 덤불 (앞에 그린다) */
function drawBush(ctx: C2, H: number, t: number, shake: number) {
  const lw = Math.max(1.2, H * 0.026), s = Math.sin(t * 0.9) * shake * H * 0.012;
  ctx.beginPath();
  ctx.moveTo(-H * 0.3, 0);
  ctx.bezierCurveTo(-H * 0.4 + s, -H * 0.2, -H * 0.26, -H * 0.36, -H * 0.12 + s, -H * 0.3);
  ctx.bezierCurveTo(-H * 0.06, -H * 0.46, H * 0.14 + s, -H * 0.46, H * 0.16, -H * 0.3);
  ctx.bezierCurveTo(H * 0.32 + s, -H * 0.36, H * 0.42, -H * 0.16, H * 0.32, 0);
  ctx.closePath();
  fs(ctx, '#63b85a', lw);
  ctx.fillStyle = '#8ed47c';
  for (const [x, y, r] of [[-0.14, -0.2, 0.07], [0.08, -0.28, 0.08], [0.2, -0.14, 0.06]]) {
    ell(ctx, H * x + s, H * y, H * r, H * r * 0.8);
    ctx.fill();
  }
  ctx.fillStyle = '#ff8fb3';
  for (const [x, y] of [[-0.2, -0.1], [0.02, -0.14], [0.24, -0.06]]) {
    ell(ctx, H * x, H * y, H * 0.022, H * 0.022);
    ctx.fill();
  }
}

/** 만화 싸움 구름 — (0,0)이 구름 가운데, r = 반지름(px) */
function drawBrawl(ctx: C2, r: number, t: number, c: Cloud, pop: number) {
  const lw = Math.max(1.5, r * 0.055), rot = t * 0.11 + c.seed, sc = 1 + pop * 0.18;
  const tint = c.mega ? '#ffe9a8' : c.tor > 0 ? '#dfe6ff' : c.kind === 2 ? '#ffe3ec' : '#fffaf0', shade = c.mega ? '#f3c96b' : c.tor > 0 ? '#b9c4f5' : '#e6dccb';
  ctx.save();
  ctx.scale(sc, sc);
  ctx.lineJoin = 'round';
  // 튀어나온 것들 (구름 뒤): 주먹·발·별
  const n = Math.min(7, 3 + Math.floor(c.n / 2));
  for (let i = 0; i < n; i++) {
    const ph = (t * 0.23 + i * 1.7 + c.seed) % 3.2, out = ph < 1.6 ? Math.sin((ph / 1.6) * Math.PI) : 0;
    if (out <= 0.05) continue;
    const a = c.seed + i * 2.4 + Math.floor((t * 0.23 + i * 1.7) / 3.2) * 1.3, d = r * (0.72 + out * 0.5), x = Math.cos(a) * d, y = Math.sin(a) * d * 0.9;
    const ci = c.cols.length ? c.cols[i % c.cols.length] : 0, col = colOf(KINDS[Math.floor(ci / 3)] ?? 'gob', ci % 3, 0)[0];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    if (i % 3 === 0) {
      // 주먹
      line(ctx, -r * 0.3, 0, 0, 0, OUT, r * 0.2);
      line(ctx, -r * 0.3, 0, 0, 0, col, r * 0.13);
      ell(ctx, r * 0.04, 0, r * 0.17, r * 0.15);
      fs(ctx, col, lw);
      line(ctx, r * 0.08, -r * 0.08, r * 0.08, r * 0.08, OUT, lw * 0.6);
    } else if (i % 3 === 1) {
      // 발
      line(ctx, -r * 0.3, 0, 0, 0, OUT, r * 0.18);
      line(ctx, -r * 0.3, 0, 0, 0, col, r * 0.11);
      ell(ctx, r * 0.05, r * 0.05, r * 0.14, r * 0.2);
      fs(ctx, '#7a4a2a', lw);
    } else {
      starPath(ctx, r * 0.1, 0, r * 0.2, t * 0.2);
      fs(ctx, '#ffe45c', lw * 0.8);
    }
    ctx.restore();
  }
  // 구름 몸: 몽글몽글 겹친 원
  const P = 9;
  ctx.beginPath();
  for (let i = 0; i < P; i++) {
    const a = rot + (i / P) * TAU, q = r * (0.6 + 0.07 * Math.sin(t * 0.5 + i * 2.1)), pr = r * (0.44 + 0.05 * Math.sin(t * 0.37 + i));
    ctx.moveTo(Math.cos(a) * q + pr, Math.sin(a) * q * 0.9);
    ctx.arc(Math.cos(a) * q, Math.sin(a) * q * 0.9, pr, 0, TAU);
  }
  ctx.lineWidth = lw * 2;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  ctx.fillStyle = tint;
  ctx.fill();
  ell(ctx, 0, 0, r * 0.7, r * 0.64);
  ctx.fill();
  // 안쪽 그늘 소용돌이
  ctx.strokeStyle = shade;
  ctx.lineWidth = lw * 1.6;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const a = -rot * 1.6 + i * 2.1;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.18, r * (0.3 + i * 0.07), a, a + 1.7);
    ctx.stroke();
  }
  if (c.tor > 0 && !c.mega) {
    ctx.strokeStyle = '#7f8ff0';
    ctx.lineWidth = lw * 1.4;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.5 + i * r * 0.5, r * (1.15 - i * 0.2), r * 0.2, 0, t * 0.4 + i, t * 0.4 + i + 3.6);
      ctx.stroke();
    }
  }
  // 구름 가장자리로 삐죽 나왔다 들어가는 얼굴
  for (let i = 0; i < Math.min(2, c.cols.length); i++) {
    const ph = (t * 0.045 + i * 0.5 + c.seed * 0.13) % 1;
    if (ph > 0.55) continue;
    const u = Math.sin((ph / 0.55) * Math.PI), a = c.seed * 0.9 + i * 2.7 + Math.floor(t * 0.045 + i * 0.5 + c.seed * 0.13) * 1.9;
    const hr = r * 0.2, hx = Math.cos(a) * r * (0.5 + u * 0.4), hy = Math.sin(a) * r * (0.42 + u * 0.36);
    const ci = c.cols[(i + Math.floor(t / 40)) % c.cols.length], col = colOf(KINDS[Math.floor(ci / 3)] ?? 'gob', ci % 3, 0)[0];
    ell(ctx, hx, hy, hr, hr);
    fs(ctx, col, lw);
    for (const sx of [-1, 1]) {
      // 뱅글 눈 대신 x 눈
      const ex0 = hx + sx * hr * 0.4, q = hr * 0.2;
      line(ctx, ex0 - q, hy - q, ex0 + q, hy + q, OUT, lw * 0.7);
      line(ctx, ex0 + q, hy - q, ex0 - q, hy + q, OUT, lw * 0.7);
    }
  }
  if (c.mega) {
    // 대장 왕관이 구름 위로 삐죽 · 번개
    ctx.save();
    ctx.translate(Math.sin(t * 0.3) * r * 0.12, -r * 0.92 + Math.abs(Math.sin(t * 0.4)) * r * 0.1);
    ctx.rotate(Math.sin(t * 0.25) * 0.3);
    ctx.beginPath();
    ctx.moveTo(-r * 0.22, r * 0.1);
    ctx.lineTo(-r * 0.26, -r * 0.2);
    ctx.lineTo(-r * 0.1, -r * 0.05);
    ctx.lineTo(0, -r * 0.26);
    ctx.lineTo(r * 0.1, -r * 0.05);
    ctx.lineTo(r * 0.26, -r * 0.2);
    ctx.lineTo(r * 0.22, r * 0.1);
    ctx.closePath();
    fs(ctx, '#ffd24a', lw);
    ctx.restore();
    for (let i = 0; i < 3; i++) {
      if ((Math.floor(t / 5) + i) % 3) continue;
      const a = c.seed + i * 2.1 + Math.floor(t / 5), d0 = r * 0.95;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * d0, Math.sin(a) * d0);
      ctx.lineTo(Math.cos(a + 0.12) * d0 * 1.2, Math.sin(a + 0.12) * d0 * 1.2);
      ctx.lineTo(Math.cos(a - 0.05) * d0 * 1.25, Math.sin(a - 0.05) * d0 * 1.25);
      ctx.lineTo(Math.cos(a + 0.08) * d0 * 1.5, Math.sin(a + 0.08) * d0 * 1.5);
      ctx.strokeStyle = '#ffe45c';
      ctx.lineWidth = lw * 1.8;
      ctx.stroke();
    }
  }
  // 앞에 튀는 것: 화난 표시·별
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.19 + i * 1.1 + c.seed * 0.3) % 2.4;
    if (ph > 1.2) continue;
    const u = ph / 1.2, a = c.seed * 1.7 + i * 2.2 + Math.floor((t * 0.19 + i * 1.1) / 2.4), x = Math.cos(a) * r * 0.42, y = Math.sin(a) * r * 0.36 - u * r * 0.2;
    ctx.globalAlpha = 1 - u * u;
    if (i === 0) {
      starPath(ctx, x, y, r * 0.16, t * 0.1);
      fs(ctx, '#ffd24a', lw * 0.7);
    } else {
      // 불끈(#)
      ctx.strokeStyle = '#e8402f';
      ctx.lineWidth = lw * 1.3;
      const q = r * 0.1;
      ctx.beginPath();
      ctx.moveTo(x - q, y - q * 0.4);
      ctx.lineTo(x - q * 0.3, y - q * 0.3);
      ctx.lineTo(x - q * 0.4, y - q);
      ctx.moveTo(x + q, y + q * 0.4);
      ctx.lineTo(x + q * 0.3, y + q * 0.3);
      ctx.lineTo(x + q * 0.4, y + q);
      ctx.moveTo(x + q * 0.4, y - q);
      ctx.lineTo(x + q * 0.3, y - q * 0.3);
      ctx.lineTo(x + q, y - q * 0.4);
      ctx.moveTo(x - q * 0.4, y + q);
      ctx.lineTo(x - q * 0.3, y + q * 0.3);
      ctx.lineTo(x - q, y + q * 0.4);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── 배경 (한 번 그려 두고 옆으로 흘린다) ──
interface Pal { sky: string[]; far: string[]; road: string[]; curb: string; lane: string[]; hedge: string[]; panel: string }
const PAL: Pal[] = [
  { sky: ['#7fcfff', '#c8ecff', '#fff4d8'], far: ['#bfe8a8', '#93d48c', '#6fbf78'], road: ['#f6dfae', '#ecc98c'], curb: '#d9ad6e', lane: ['#a6dc7c', '#86c964'], hedge: ['#63b85a', '#8ed47c'], panel: '#fff6dc' },
  { sky: ['#8fdcc8', '#d4f4e2', '#fff7cf'], far: ['#a6dfa0', '#74c486', '#52a870'], road: ['#e6cf9a', '#d4b87c'], curb: '#b8975e', lane: ['#8fd27a', '#6fba60'], hedge: ['#4fa85a', '#7fcc74'], panel: '#f4ffe4' },
  { sky: ['#6fc4ff', '#bfe6ff', '#ffe9d2'], far: ['#7fd0f2', '#55b6e6', '#3f9fd8'], road: ['#f0d2a6', '#e2bb88'], curb: '#c79a66', lane: ['#f7e7b8', '#ecd79a'], hedge: ['#ffffff', '#ff9a9a'], panel: '#eef8ff' },
];
function layer(wpx: number, hpx: number, sc: number, paint: (g: C2) => void): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(wpx * sc));
  c.height = Math.max(1, Math.ceil(hpx * sc));
  const g = c.getContext('2d')!;
  g.scale(sc, sc);
  paint(g);
  return c;
}
function stall(g: C2, x: number, base: number, wd: number, hg: number, c1: string, c2: string, seed: number) {
  const lw = Math.max(1.2, wd * 0.02);
  // 기둥 · 판매대
  for (const sx of [-1, 1]) {
    rr(g, x + sx * wd * 0.44 - wd * 0.025, base - hg, wd * 0.05, hg, 2);
    fs(g, '#b98352', lw);
  }
  rr(g, x - wd * 0.5, base - hg * 0.42, wd, hg * 0.42, wd * 0.03);
  fs(g, '#e2b47a', lw);
  rr(g, x - wd * 0.5, base - hg * 0.42, wd, hg * 0.1, wd * 0.03);
  fs(g, '#c98a4b', lw);
  // 물건
  for (let i = 0; i < 5; i++) {
    ell(g, x - wd * 0.36 + i * wd * 0.18, base - hg * 0.47, wd * 0.07, wd * 0.065);
    fs(g, ['#ff7b6b', '#ffd24a', '#8fd67a', '#ff9a3c', '#c4b2f6'][(i + seed) % 5], lw * 0.8);
  }
  // 줄무늬 천막 (아래가 물결)
  const top = base - hg * 1.05, bot = base - hg * 0.72, n = 6;
  for (let i = 0; i < n; i++) {
    const x0 = x - wd * 0.58 + (i * wd * 1.16) / n, x1 = x0 + (wd * 1.16) / n;
    g.beginPath();
    g.moveTo(x - wd * 0.46 + (i * wd * 0.92) / n, top);
    g.lineTo(x - wd * 0.46 + ((i + 1) * wd * 0.92) / n, top);
    g.lineTo(x1, bot);
    g.arc((x0 + x1) / 2, bot, (x1 - x0) / 2, 0, Math.PI);
    g.closePath();
    fs(g, i % 2 ? c1 : c2, lw);
  }
}
function tree(g: C2, x: number, base: number, k: number, c1: string, c2: string) {
  const lw = Math.max(1.2, k * 0.04);
  rr(g, x - k * 0.09, base - k * 0.6, k * 0.18, k * 0.6, k * 0.04);
  fs(g, '#a8744a', lw);
  for (const [dx, dy, r] of [[-0.3, -0.72, 0.34], [0.3, -0.74, 0.34], [0, -1.0, 0.42]]) {
    ell(g, x + dx * k, base + dy * k, r * k, r * k * 0.92);
    fs(g, c1, lw);
  }
  g.fillStyle = c2;
  for (const [dx, dy, r] of [[-0.12, -1.1, 0.16], [0.24, -0.84, 0.12], [-0.32, -0.8, 0.1]]) {
    ell(g, x + dx * k, base + dy * k, r * k, r * k * 0.8);
    g.fill();
  }
}
function mushHouse(g: C2, x: number, base: number, k: number, cap: string) {
  const lw = Math.max(1.2, k * 0.04);
  rr(g, x - k * 0.26, base - k * 0.6, k * 0.52, k * 0.6, k * 0.1);
  fs(g, '#fff3da', lw);
  rr(g, x - k * 0.09, base - k * 0.32, k * 0.18, k * 0.32, k * 0.08);
  fs(g, '#b98352', lw * 0.8);
  ell(g, x + k * 0.16, base - k * 0.42, k * 0.06, k * 0.06);
  fs(g, '#9fe0ff', lw * 0.7);
  g.beginPath();
  g.moveTo(x - k * 0.6, base - k * 0.56);
  g.quadraticCurveTo(x - k * 0.5, base - k * 1.25, x, base - k * 1.25);
  g.quadraticCurveTo(x + k * 0.5, base - k * 1.25, x + k * 0.6, base - k * 0.56);
  g.quadraticCurveTo(x, base - k * 0.7, x - k * 0.6, base - k * 0.56);
  fs(g, cap, lw);
  g.fillStyle = '#ffffff';
  for (const [dx, dy, r] of [[-0.3, -0.84, 0.09], [0.08, -1.02, 0.11], [0.34, -0.8, 0.07]]) {
    ell(g, x + dx * k, base + dy * k, r * k, r * k * 0.8);
    g.fill();
  }
}
function hut(g: C2, x: number, base: number, k: number, c1: string) {
  const lw = Math.max(1.2, k * 0.04);
  rr(g, x - k * 0.3, base - k * 0.62, k * 0.6, k * 0.62, k * 0.03);
  fs(g, '#ffffff', lw);
  g.fillStyle = c1;
  for (let i = 0; i < 3; i++) g.fillRect(x - k * 0.3 + (i * 2 + 0.5) * k * 0.1, base - k * 0.6, k * 0.1, k * 0.58);
  rr(g, x - k * 0.3, base - k * 0.62, k * 0.6, k * 0.62, k * 0.03);
  g.lineWidth = lw;
  g.strokeStyle = OUT;
  g.stroke();
  g.beginPath();
  g.moveTo(x - k * 0.4, base - k * 0.6);
  g.lineTo(x, base - k * 1.0);
  g.lineTo(x + k * 0.4, base - k * 0.6);
  g.closePath();
  fs(g, c1, lw);
  rr(g, x - k * 0.08, base - k * 0.34, k * 0.16, k * 0.34, k * 0.02);
  fs(g, '#7bb7ff', lw * 0.8);
}
function bunting(g: C2, x0: number, x1: number, y: number, sag: number, n: number) {
  g.strokeStyle = OUT;
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(x0, y);
  g.quadraticCurveTo((x0 + x1) / 2, y + sag * 2, x1, y);
  g.stroke();
  for (let i = 1; i < n; i++) {
    const u = i / n, px = x0 + (x1 - x0) * u, py = y + sag * 4 * u * (1 - u), q = (x1 - x0) / n / 2.6;
    g.beginPath();
    g.moveTo(px - q, py);
    g.lineTo(px + q, py);
    g.lineTo(px, py + q * 2.1);
    g.closePath();
    fs(g, ['#ff7b6b', '#ffd24a', '#7be0c3', '#7bb7ff', '#ff93b6'][i % 5], 1);
  }
}
interface Bg { sky: HTMLCanvasElement; far: HTMLCanvasElement; mid: HTMLCanvasElement; ground: HTMLCanvasElement; front: HTMLCanvasElement }
const bgCache = new Map<string, Bg>();
/** 층별 세로 자리(폭 = 1): 먼 층 높이 · 가운데 층 높이 · 땅 위·아래 · 앞 울타리 */
const FAR_H = 0.3, MID_H = 0.4, GR0 = HZ, GR1 = 1.36, FR0 = 1.2, FR1 = 1.36;
function getBg(w: number, ch: number, sc: number): Bg {
  const key = `${w}|${ch}|${sc}`;
  let bg = bgCache.get(key);
  if (bg) return bg;
  if (bgCache.size > 5) bgCache.clear();
  const P = PAL[ch], R = (r: number) => r * w;
  const sky = layer(w, R(HZ + 0.06), sc, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, R(HZ + 0.06));
    gr.addColorStop(0, P.sky[0]);
    gr.addColorStop(0.6, P.sky[1]);
    gr.addColorStop(1, P.sky[2]);
    g.fillStyle = gr;
    g.fillRect(0, 0, w, R(HZ + 0.06));
    // 해 · 햇무리
    const sx = R(0.8), sy = R(0.22);
    const hg = g.createRadialGradient(sx, sy, R(0.03), sx, sy, R(0.3));
    hg.addColorStop(0, 'rgba(255,250,210,.9)');
    hg.addColorStop(1, 'rgba(255,250,210,0)');
    g.fillStyle = hg;
    g.fillRect(0, 0, w, R(HZ));
    ell(g, sx, sy, R(0.06), R(0.06));
    fs(g, '#fff6c2');
    // 구름
    g.fillStyle = 'rgba(255,255,255,.9)';
    for (const [cx, cy, k] of [[0.18, 0.2, 1], [0.52, 0.27, 0.7], [0.95, 0.36, 0.8]]) {
      for (const [dx, dy, r] of [[-0.06, 0, 0.035], [0, -0.015, 0.05], [0.065, 0, 0.038], [0, 0.012, 0.06]]) {
        ell(g, R(cx + dx * k), R(cy + dy * k), R(r * k * 1.3), R(r * k * 0.8));
        g.fill();
      }
    }
  });
  const far = layer(w, R(FAR_H), sc, (g) => {
    const H0 = R(FAR_H);
    if (ch === 2) {
      // 바다 · 돛단배 · 등대
      const gr = g.createLinearGradient(0, R(0.1), 0, H0);
      gr.addColorStop(0, P.far[0]);
      gr.addColorStop(1, P.far[2]);
      g.fillStyle = gr;
      g.fillRect(0, R(0.1), w, H0);
      g.strokeStyle = 'rgba(255,255,255,.7)';
      g.lineWidth = 1.5;
      for (let i = 0; i < 14; i++) {
        const x = hsh(i * 3.1) * w, y = R(0.12 + hsh(i * 7.7) * 0.16), q = R(0.02 + hsh(i) * 0.02);
        g.beginPath();
        g.moveTo(x - q, y);
        g.quadraticCurveTo(x, y - q * 0.4, x + q, y);
        g.stroke();
      }
      for (const [bx, by, k] of [[0.22, 0.14, 1], [0.66, 0.17, 0.75]]) {
        g.beginPath();
        g.moveTo(R(bx - 0.04 * k), R(by));
        g.lineTo(R(bx + 0.04 * k), R(by));
        g.lineTo(R(bx + 0.028 * k), R(by + 0.018 * k));
        g.lineTo(R(bx - 0.028 * k), R(by + 0.018 * k));
        g.closePath();
        fs(g, '#ff7b6b', 1.2);
        g.beginPath();
        g.moveTo(R(bx), R(by - 0.07 * k));
        g.lineTo(R(bx + 0.035 * k), R(by - 0.006));
        g.lineTo(R(bx), R(by - 0.006));
        g.closePath();
        fs(g, '#ffffff', 1.2);
      }
      rr(g, R(0.88), R(0.0), R(0.045), R(0.14), 2);
      fs(g, '#ffffff', 1.4);
      g.fillStyle = '#ff6f5e';
      g.fillRect(R(0.88), R(0.035), R(0.045), R(0.03));
      g.fillRect(R(0.88), R(0.095), R(0.045), R(0.03));
      rr(g, R(0.872), R(-0.02), R(0.061), R(0.03), 2);
      fs(g, '#ffd24a', 1.4);
    } else {
      // 겹친 언덕
      for (let L = 0; L < 3; L++) {
        g.beginPath();
        g.moveTo(0, H0);
        for (let i = 0; i <= 40; i++) {
          const u = i / 40;
          g.lineTo(u * w, R(0.05 + L * 0.07) + Math.sin(u * TAU * (2 + L) + L * 1.7) * R(0.03) + Math.sin(u * TAU * (L + 1) + 1) * R(0.02));
        }
        g.lineTo(w, H0);
        g.closePath();
        g.fillStyle = P.far[L];
        g.fill();
      }
      // 먼 집·나무
      for (let i = 0; i < 7; i++) {
        const x = (i + 0.5) * (w / 7), y = R(0.17 + hsh(i * 5 + ch) * 0.05);
        if (i % 2) {
          rr(g, x - R(0.016), y - R(0.02), R(0.032), R(0.024), 1);
          fs(g, '#fff6e0');
          g.beginPath();
          g.moveTo(x - R(0.022), y - R(0.018));
          g.lineTo(x, y - R(0.04));
          g.lineTo(x + R(0.022), y - R(0.018));
          g.closePath();
          fs(g, '#ff9a7a');
        } else {
          ell(g, x, y - R(0.025), R(0.02), R(0.026));
          fs(g, P.far[2]);
        }
      }
    }
  });
  const MW = 2;
  const mid = layer(w * MW, R(MID_H), sc, (g) => {
    const base = R(MID_H - 0.02);
    // 뒤 담장/풀숲 띠
    g.fillStyle = ch === 2 ? '#f3dcae' : P.far[2];
    g.fillRect(0, base - R(0.05), w * MW, R(0.052));
    if (ch === 0) {
      const cols = [['#ff6f5e', '#ffffff'], ['#5fb0ff', '#ffffff'], ['#ffc93c', '#ffffff'], ['#7bd67a', '#ffffff'], ['#ff93b6', '#ffffff']];
      for (let i = 0; i < 5; i++) {
        const x = R(0.2 + i * 0.4), c = cols[i % 5];
        stall(g, x, base, R(0.26), R(0.24 + (i % 2) * 0.03), c[0], c[1], i);
        if (i < 4) bunting(g, x + R(0.13), x + R(0.27), base - R(0.3), R(0.02), 5);
      }
      for (let i = 0; i < 5; i++) tree(g, R(0.4 + i * 0.4), base - R(0.02), R(0.1), '#7fcf78', '#a9e596');
    } else if (ch === 1) {
      for (let i = 0; i < 6; i++) tree(g, R(0.12 + i * 0.34), base, R(0.2 + (i % 3) * 0.03), i % 2 ? '#58b06a' : '#6cc276', '#93da8c');
      for (let i = 0; i < 4; i++) mushHouse(g, R(0.3 + i * 0.5), base + R(0.01), R(0.15), ['#ff6f5e', '#ffb03c', '#c48fe8', '#ff8fb3'][i]);
    } else {
      for (let i = 0; i < 5; i++) {
        hut(g, R(0.18 + i * 0.4), base, R(0.2), ['#ff7b6b', '#5fb0ff', '#ffc93c', '#7be0c3', '#ff93b6'][i]);
        if (i < 4) bunting(g, R(0.26 + i * 0.4), R(0.5 + i * 0.4), base - R(0.2), R(0.02), 6);
      }
      // 풍선 다발
      for (let i = 0; i < 4; i++) {
        const x = R(0.38 + i * 0.5);
        for (let j = 0; j < 3; j++) {
          line(g, x, base - R(0.02), x + R((j - 1) * 0.02), base - R(0.13 + j * 0.012), OUT, 1);
          ell(g, x + R((j - 1) * 0.024), base - R(0.15 + j * 0.012), R(0.02), R(0.025));
          fs(g, ['#ff7b6b', '#ffd24a', '#7bb7ff'][(i + j) % 3], 1.2);
        }
      }
    }
  });
  const ground = layer(w, R(GR1 - GR0), sc, (g) => {
    const H0 = R(GR1 - GR0), y = (v: number) => R(v - GR0);
    const gr = g.createLinearGradient(0, 0, 0, y(1.18));
    gr.addColorStop(0, P.road[0]);
    gr.addColorStop(1, P.road[1]);
    g.fillStyle = gr;
    g.fillRect(0, 0, w, H0);
    // 길 뒤쪽 턱
    g.fillStyle = P.curb;
    g.fillRect(0, y(0.63), w, R(0.022));
    g.fillStyle = 'rgba(255,255,255,.35)';
    g.fillRect(0, y(0.63), w, R(0.005));
    // 바닥 무늬
    if (ch === 2) {
      g.strokeStyle = 'rgba(150,100,50,.28)';
      g.lineWidth = 1.2;
      for (let i = 0; i < 9; i++) {
        const yy = y(0.67 + i * 0.06);
        g.beginPath();
        g.moveTo(0, yy);
        g.lineTo(w, yy);
        g.stroke();
        for (let j = 0; j < 4; j++) {
          const xx = ((j + (i % 2) * 0.5) / 4) * w + R(0.05);
          g.beginPath();
          g.moveTo(xx, yy);
          g.lineTo(xx, yy + R(0.06));
          g.stroke();
        }
      }
    } else {
      for (let i = 0; i < 46; i++) {
        const xx = R(0.04 + hsh(i * 3.3 + ch) * 0.92), yy = y(0.68 + hsh(i * 9.1 + ch) * 0.46), q = R(0.012 + hsh(i) * 0.014);
        if (ch === 0) {
          rr(g, xx - q, yy - q * 0.5, q * 2, q, q * 0.5);
          g.fillStyle = i % 3 ? 'rgba(255,255,255,.28)' : 'rgba(190,140,70,.2)';
          g.fill();
        } else {
          ell(g, xx, yy, q * 0.7, q * 0.4);
          g.fillStyle = i % 3 ? 'rgba(140,105,60,.22)' : 'rgba(255,255,255,.25)';
          g.fill();
          if (i % 4 === 0) {
            g.strokeStyle = '#6fba60';
            g.lineWidth = 1.5;
            g.beginPath();
            g.moveTo(xx - q, yy);
            g.lineTo(xx - q * 1.3, yy - q);
            g.moveTo(xx - q * 0.6, yy);
            g.lineTo(xx - q * 0.5, yy - q * 1.3);
            g.moveTo(xx - q * 0.2, yy);
            g.lineTo(xx + q * 0.2, yy - q);
            g.stroke();
          }
        }
      }
    }
    // 길가 소품: 나무 상자·통·화분
    for (let i = 0; i < 4; i++) {
      const xx = R(0.11 + i * 0.25 + hsh(i * 4.4 + ch) * 0.05), yy = y(0.708), q = R(0.03 + hsh(i * 1.7 + ch) * 0.008);
      g.fillStyle = 'rgba(90,60,20,.16)';
      ell(g, xx, yy + q * 0.1, q * 1.2, q * 0.3);
      g.fill();
      if ((i + ch) % 3 === 0) {
        rr(g, xx - q, yy - q * 1.5, q * 2, q * 1.5, 2);
        fs(g, '#d9a566', 1.6);
        line(g, xx - q, yy - q * 1.5, xx + q, yy, OUT, 1.2);
        line(g, xx + q, yy - q * 1.5, xx - q, yy, OUT, 1.2);
      } else if ((i + ch) % 3 === 1) {
        rr(g, xx - q * 0.8, yy - q * 1.8, q * 1.6, q * 1.8, q * 0.5);
        fs(g, '#c98a4b', 1.6);
        line(g, xx - q * 0.86, yy - q * 1.3, xx + q * 0.86, yy - q * 1.3, '#8a8f98', 2);
        line(g, xx - q * 0.86, yy - q * 0.5, xx + q * 0.86, yy - q * 0.5, '#8a8f98', 2);
      } else {
        for (const [dx, col] of [[-0.5, '#ff8fb3'], [0.5, '#ffe45c'], [0, '#ff6f5e']] as [number, string][]) {
          line(g, xx + dx * q, yy - q * 0.8, xx + dx * q * 1.3, yy - q * 1.9, '#4d9a4a', 2);
          ell(g, xx + dx * q * 1.3, yy - q * 2.0, q * 0.34, q * 0.34);
          fs(g, col, 1.2);
        }
        rr(g, xx - q * 0.8, yy - q, q * 1.6, q, 3);
        fs(g, '#e8793f', 1.6);
      }
    }
    // 여우가 가는 앞줄 (풀밭/모래)
    const lg = g.createLinearGradient(0, y(1.16), 0, H0);
    lg.addColorStop(0, P.lane[0]);
    lg.addColorStop(1, P.lane[1]);
    g.fillStyle = lg;
    g.beginPath();
    g.moveTo(0, y(1.17));
    for (let i = 0; i <= 24; i++) g.lineTo((i / 24) * w, y(1.168) + Math.sin((i / 24) * TAU * 4) * R(0.006));
    g.lineTo(w, H0);
    g.lineTo(0, H0);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(0,0,0,.07)';
    g.fillRect(0, y(1.166), w, R(0.012));
  });
  const front = layer(w, R(FR1 - FR0), sc, (g) => {
    const y = (v: number) => R(v - FR0);
    if (ch === 2) {
      // 밧줄 난간
      for (let i = 0; i < 5; i++) {
        const x = (i + 0.5) * (w / 5);
        rr(g, x - R(0.012), y(1.265), R(0.024), R(0.08), 2);
        fs(g, '#c98a4b', 1.5);
        ell(g, x, y(1.265), R(0.016), R(0.008));
        fs(g, '#e2b47a', 1.2);
      }
      g.strokeStyle = '#f4ead0';
      g.lineWidth = 3;
      g.beginPath();
      for (let i = 0; i <= 5; i++) {
        const x = (i - 0.5) * (w / 5), x1 = (i + 0.5) * (w / 5);
        g.moveTo(x, y(1.285));
        g.quadraticCurveTo((x + x1) / 2, y(1.315), x1, y(1.285));
      }
      g.stroke();
    } else {
      // 낮은 풀 울타리
      g.beginPath();
      g.moveTo(0, y(FR1));
      for (let i = 0; i <= 14; i++) {
        const x0 = (i / 14) * w;
        g.lineTo(x0, y(1.31));
        g.quadraticCurveTo(x0 + w / 28, y(1.268 + hsh(i * 2.2) * 0.012), x0 + w / 14, y(1.31));
      }
      g.lineTo(w, y(FR1));
      g.closePath();
      fs(g, P.hedge[0], 1.6);
      g.fillStyle = P.hedge[1];
      for (let i = 0; i < 14; i++) {
        ell(g, (i + 0.45) * (w / 14), y(1.298), R(0.018), R(0.009));
        g.fill();
      }
      for (let i = 0; i < 7; i++) {
        const x = (i * 2 + 1) * (w / 14) + R(0.01);
        ell(g, x, y(1.31), R(0.009), R(0.009));
        fs(g, i % 2 ? '#ffe45c' : '#ff8fb3', 1);
      }
    }
  });
  bg = { sky, far, mid, ground, front };
  bgCache.set(key, bg);
  return bg;
}
/** 옆으로 이어 붙여 그리기 */
function tile(ctx: C2, img: HTMLCanvasElement, off: number, y: number, tw: number, th: number, w: number) {
  let x = -(((off % tw) + tw) % tw);
  for (; x < w; x += tw) ctx.drawImage(img, x, y, tw, th);
}

function drawPot(ctx: C2, k: number, t: number, glow: number) {
  const lw = Math.max(1.6, k * 0.03);
  ctx.lineJoin = 'round';
  // 받침
  ell(ctx, 0, 0, k * 0.5, k * 0.13);
  fs(ctx, '#c98a4b', lw);
  // 단지
  ctx.beginPath();
  ctx.moveTo(-k * 0.3, -k * 0.86);
  ctx.bezierCurveTo(-k * 0.62, -k * 0.7, -k * 0.6, -k * 0.1, -k * 0.3, -k * 0.02);
  ctx.lineTo(k * 0.3, -k * 0.02);
  ctx.bezierCurveTo(k * 0.6, -k * 0.1, k * 0.62, -k * 0.7, k * 0.3, -k * 0.86);
  ctx.closePath();
  fs(ctx, '#ffb347', lw);
  ctx.fillStyle = 'rgba(255,255,255,.4)';
  ell(ctx, -k * 0.28, -k * 0.5, k * 0.06, k * 0.2, 0.2);
  ctx.fill();
  // 흘러내리는 꿀
  ctx.beginPath();
  ctx.moveTo(-k * 0.34, -k * 0.86);
  ctx.quadraticCurveTo(-k * 0.3, -k * 0.6 + Math.sin(t * 0.05) * k * 0.03, -k * 0.2, -k * 0.74);
  ctx.quadraticCurveTo(-k * 0.08, -k * 0.5, 0.02 * k, -k * 0.72);
  ctx.quadraticCurveTo(k * 0.12, -k * 0.56 + Math.sin(t * 0.04 + 1) * k * 0.04, k * 0.2, -k * 0.76);
  ctx.quadraticCurveTo(k * 0.3, -k * 0.66, k * 0.34, -k * 0.86);
  ctx.closePath();
  fs(ctx, '#ffd84a', lw * 0.8);
  ell(ctx, 0, -k * 0.88, k * 0.36, k * 0.09);
  fs(ctx, '#ffe680', lw);
  rr(ctx, -k * 0.2, -k * 0.46, k * 0.4, k * 0.26, k * 0.04);
  fs(ctx, '#fff6dc', lw * 0.7);
  // 벌집 무늬 딱지
  ctx.strokeStyle = '#e09a1f';
  ctx.lineWidth = lw * 0.8;
  for (const [hx, hy] of [[-0.08, -0.36], [0.08, -0.36], [0, -0.28]]) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) ctx.lineTo(k * hx + Math.cos((i * TAU) / 6) * k * 0.05, k * hy + Math.sin((i * TAU) / 6) * k * 0.05);
    ctx.closePath();
    ctx.stroke();
  }
  // 반짝
  for (let i = 0; i < 3; i++) {
    const a = t * 0.03 + i * 2.1, u = 0.5 + 0.5 * Math.sin(t * 0.1 + i * 2);
    ctx.globalAlpha = (0.4 + 0.6 * u) * (0.6 + glow * 0.4);
    starPath(ctx, Math.cos(a) * k * 0.55, -k * 0.6 + Math.sin(a) * k * 0.4, k * (0.05 + 0.04 * u), t * 0.02);
    fs(ctx, '#fffbe0');
  }
  ctx.globalAlpha = 1;
}
function drawHand(ctx: C2, k: number, press: number) {
  ctx.save();
  ctx.translate(0, press * k * 0.12);
  ctx.rotate(-0.25);
  ctx.lineJoin = 'round';
  rr(ctx, -k * 0.16, -k * 0.02, k * 0.32, k * 0.72, k * 0.15);
  fs(ctx, '#ffffff', Math.max(1.6, k * 0.07));
  rr(ctx, -k * 0.36, k * 0.34, k * 0.72, k * 0.6, k * 0.2);
  fs(ctx, '#ffffff', Math.max(1.6, k * 0.07));
  rr(ctx, -k * 0.14, k * 0.3, k * 0.28, k * 0.3, k * 0.1);
  fs(ctx, '#ffffff');
  ctx.restore();
}
/** 장 끝 물건 (세상 속 큰 물건): 0 뿅망치 · 1 고춧가루 · 2 벌집 · 3 확성기 */
function drawPerk(ctx: C2, id: number, k: number, t: number) {
  const lw = Math.max(1.8, k * 0.04);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (id === 0) {
    ctx.save();
    ctx.rotate(-0.5 + Math.sin(t * 0.12) * 0.25);
    line(ctx, 0, k * 0.5, 0, -k * 0.3, OUT, lw * 4);
    line(ctx, 0, k * 0.5, 0, -k * 0.3, '#e2b47a', lw * 2.4);
    rr(ctx, -k * 0.5, -k * 0.62, k, k * 0.42, k * 0.1);
    fs(ctx, '#ff6f5e', lw);
    for (const sx of [-1, 1]) {
      rr(ctx, sx * k * 0.5 - k * 0.1, -k * 0.66, k * 0.2, k * 0.5, k * 0.06);
      fs(ctx, '#ffd24a', lw);
    }
    starPath(ctx, 0, -k * 0.41, k * 0.13, 0);
    fs(ctx, '#ffffff');
    ctx.restore();
  } else if (id === 1) {
    ctx.save();
    ctx.rotate(Math.sin(t * 0.1) * 0.12);
    ctx.beginPath();
    ctx.moveTo(-k * 0.12, -k * 0.42);
    ctx.bezierCurveTo(-k * 0.6, -k * 0.3, -k * 0.5, k * 0.5, k * 0.25, k * 0.6);
    ctx.bezierCurveTo(k * 0.1, k * 0.2, k * 0.45, -k * 0.2, k * 0.14, -k * 0.44);
    ctx.closePath();
    fs(ctx, '#e8402f', lw);
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ell(ctx, -k * 0.2, -k * 0.05, k * 0.07, k * 0.2, 0.3);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-k * 0.16, -k * 0.4);
    ctx.quadraticCurveTo(0, -k * 0.56, k * 0.06, -k * 0.74);
    ctx.quadraticCurveTo(k * 0.16, -k * 0.56, k * 0.18, -k * 0.42);
    ctx.closePath();
    fs(ctx, '#4d9a4a', lw);
    ctx.restore();
  } else if (id === 2) {
    line(ctx, 0, -k * 0.74, 0, -k * 0.56, OUT, lw * 1.6);
    for (let i = 0; i < 4; i++) {
      ell(ctx, 0, -k * 0.42 + i * k * 0.23, k * (0.26 + (i < 2 ? i : 3 - i) * 0.14), k * 0.15);
      fs(ctx, i % 2 ? '#ffc93c' : '#ffb01f', lw);
    }
    ell(ctx, 0, k * 0.08, k * 0.1, k * 0.1);
    fs(ctx, '#6b3a1c');
    // 벌
    for (let i = 0; i < 3; i++) {
      const a = t * 0.13 + i * 2.1, bx = Math.cos(a) * k * 0.62, by = -k * 0.1 + Math.sin(a * 1.3) * k * 0.4;
      ell(ctx, bx, by - k * 0.05, k * 0.06, k * 0.035);
      fs(ctx, 'rgba(255,255,255,.9)', 1);
      ell(ctx, bx, by, k * 0.07, k * 0.05);
      fs(ctx, '#ffd24a', lw * 0.6);
      line(ctx, bx, by - k * 0.05, bx, by + k * 0.05, OUT, lw * 0.6);
    }
  } else {
    ctx.save();
    ctx.rotate(-0.2 + Math.sin(t * 0.14) * 0.08);
    ctx.beginPath();
    ctx.moveTo(-k * 0.4, -k * 0.14);
    ctx.lineTo(k * 0.4, -k * 0.5);
    ctx.lineTo(k * 0.4, k * 0.5);
    ctx.lineTo(-k * 0.4, k * 0.14);
    ctx.closePath();
    fs(ctx, '#7bb7ff', lw);
    ell(ctx, k * 0.4, 0, k * 0.12, k * 0.5);
    fs(ctx, '#ffffff', lw);
    rr(ctx, -k * 0.56, -k * 0.16, k * 0.18, k * 0.32, k * 0.05);
    fs(ctx, '#ff6f5e', lw);
    rr(ctx, -k * 0.2, k * 0.1, k * 0.14, k * 0.34, k * 0.05);
    fs(ctx, '#ff6f5e', lw);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = lw;
    for (let i = 0; i < 3; i++) {
      const u = ((t * 0.04 + i / 3) % 1);
      ctx.globalAlpha = 1 - u;
      ctx.beginPath();
      ctx.arc(k * 0.5, 0, k * (0.25 + u * 0.5), -0.7, 0.7);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

/** 큰 동전 수는 '만'으로 줄여 쓴다 (12.3만 · 158만) */
const coins = (n: number) => (n < 100000 ? String(n) : (n / 10000).toFixed(n < 1000000 ? 1 : 0) + '만');
/** 도감 순서 = 판 순서 */
const DEX: { key: string; k: K; ch: number }[] = STAGES.map((d) => ({ key: d.key === 'boss' ? 'boss' + d.ch : d.key, k: d.key, ch: d.ch }));
const depth = (y: number) => 0.9 + 0.2 * clamp((y - MY0) / (MY1 - MY0), -0.3, 1.2);
const WOW_COL = ['#ffd24a', '#ff9a3c', '#ff6f5e', '#ff5ab0', '#a56fe0', '#4aa8f0', '#2fbf8f'];
const LINK_COL = ['#5fc8a8', '#4aa8f0', '#a56fe0'];
/** 화면 글자: 가운데 큰 띠는 한 번에 하나(새 것이 오면 앞의 것은 사라진다), 작은 반응 글자는 같은 자리에 하나만 */
interface Small { x: number; y: number; str: string; col: string; size: number; t: number; cell: number }
interface Texts { big: { str: string; sub: string; col: string; t: number } | null; small: Small[] }
const textStore = new WeakMap<object, Texts>();
const textsOf = (s: object) => {
  let q = textStore.get(s);
  if (!q) textStore.set(s, (q = { big: null, small: [] }));
  return q;
};

function drawAll(ctx: C2, s: BrawlState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, d = STAGES[s.stage], P = PAL[d.ch], cam = s.cam;
  const X = (x: number) => (x - cam) * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const sc = clamp(Math.round(typeof ctx.getTransform === 'function' ? ctx.getTransform().a || 1 : 1), 1, 2);
  const bg = getBg(Math.round(w), d.ch, sc);
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const text = (str: string, x: number, y: number, fill: string, stroke = '', lw = 3) => {
    if (stroke) (ctx.lineWidth = lw), (ctx.strokeStyle = stroke), (ctx.lineJoin = 'round'), ctx.strokeText(str, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(str, x, y);
  };
  /** 입자는 160개를 넘기지 않는다 */
  const puff = (x: number, y: number, col: string, n: number, sp = 3, sz = 3) => {
    const room = 150 - fx.particles.length;
    if (room > 0) fx.burst(x, y, col, Math.min(n, room), sp, sz);
  };
  const play = s.phase === 'play';
  const tx = textsOf(s);
  /** 작은 반응 글자 (세상 좌표) — 같은 칸에는 하나만 */
  const say = (x: number, y: number, str: string, col = '#ffffff', size = 15) => {
    const cell = Math.round(x / 0.17) * 100 + Math.round(y / 0.13), i = tx.small.findIndex((q) => q.cell === cell), it = { x, y, str, col, size, t, cell };
    if (i >= 0) tx.small[i] = it;
    else tx.small.push(it);
    if (tx.small.length > 6) tx.small.shift();
  };
  /** 가운데 큰 띠 — 하나만 */
  const band = (str: string, sub: string, col: string) => void (tx.big = { str, sub, col, t });

  ctx.save();
  fx.begin(ctx);
  // ── 하늘 · 먼 풍경 · 길 · 가게 (시차) ──
  ctx.fillStyle = P.sky[2];
  ctx.fillRect(-20, -20, w + 40, h + 40);
  ctx.drawImage(bg.sky, 0, 0, w, R(HZ + 0.06));
  tile(ctx, bg.far, cam * w * 0.12, R(HZ - FAR_H + 0.05), w, R(FAR_H), w);
  tile(ctx, bg.ground, cam * w, R(GR0), w, R(GR1 - GR0), w);
  tile(ctx, bg.mid, cam * w * 0.55, R(0.648 - MID_H + 0.02), w * 2, R(MID_H), w);
  // 가게 지붕 위 구경꾼 참새 (큰 순간에 폴짝)
  const wowAge = t - (tx.big?.t ?? -999);
  for (let i = 0; i < 3; i++) {
    const bx = ((((i * 0.37 + 0.15) * w * 2 - cam * w * 0.55) % (w * 2)) + w * 2) % (w * 2) - w * 0.2;
    if (bx < -20 || bx > w + 20) continue;
    const hop = wowAge < 50 ? Math.abs(Math.sin((wowAge + i * 5) * 0.3)) * R(0.03) : Math.max(0, Math.sin(t * 0.05 + i * 2) - 0.9) * R(0.1);
    const by = R(0.335 + (i % 2) * 0.03) - hop;
    ell(ctx, bx, by, R(0.02), R(0.016));
    fs(ctx, '#c9925e', 1.4);
    ell(ctx, bx + R(0.014), by - R(0.012), R(0.012), R(0.011));
    fs(ctx, '#c9925e', 1.4);
    ell(ctx, bx + R(0.018), by - R(0.014), R(0.003), R(0.003));
    fs(ctx, '#2a1a10');
    ctx.beginPath();
    ctx.moveTo(bx + R(0.025), by - R(0.014));
    ctx.lineTo(bx + R(0.036), by - R(0.01));
    ctx.lineTo(bx + R(0.025), by - R(0.006));
    fs(ctx, '#ffb03c');
  }

  // ── 땅 위 표시: 올빼미 원 · 멧돼지 돌진 길 · 순찰의 눈길 ──
  for (const m of s.mons) {
    const mx = X(m.x), my = Y(m.y);
    if (mx < -R(0.3) || mx > w + R(0.3)) continue;
    if (m.k === 'owl' && (m.st === IDLE || m.st === NOTICE)) {
      const hot = m.wind > 0 ? m.wind / OWL_WIND : 0;
      ell(ctx, mx, my, R(OWL_R), R(OWL_R));
      ctx.fillStyle = `rgba(255,80,60,${0.06 + hot * 0.2})`;
      ctx.fill();
      ctx.setLineDash([R(0.02), R(0.016)]);
      ctx.lineDashOffset = t * 0.4;
      ctx.lineWidth = 2 + hot * 2;
      ctx.strokeStyle = `rgba(232,64,47,${0.55 + hot * 0.45})`;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (m.k === 'guard' && m.st === IDLE && m.wind > 0) {
      // 순찰이 여우를 보는 눈길
      ctx.setLineDash([R(0.012), R(0.012)]);
      ctx.lineDashOffset = -t * 0.6;
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = `rgba(232,64,47,${0.35 + 0.5 * (m.wind / WATCH_T)})`;
      ctx.beginPath();
      ctx.moveTo(mx, my - R(0.07));
      ctx.lineTo(X(s.fx) + R(0.03), Y(FOX_Y) - R(0.13));
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (m.k === 'boar' && m.st === SLEEP) {
      // 보는 쪽으로 돌진 길 (>>>)
      ctx.strokeStyle = '#ff6f5e';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const ca = Math.cos(m.ang), sa = Math.sin(m.ang) * 0.8;
      for (let i = 0; i < 6; i++) {
        const u = 0.11 + i * 0.11 + ((t * 0.004) % 0.11), ax = mx + ca * R(u), ay = my - R(0.02) + sa * R(u), q = R(0.02);
        ctx.globalAlpha = 0.85 * (1 - u / 0.85);
        ctx.beginPath();
        ctx.moveTo(ax - ca * q - sa * q, ay - sa * q + ca * q);
        ctx.lineTo(ax, ay);
        ctx.lineTo(ax - ca * q + sa * q, ay - sa * q - ca * q);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    if (m.k === 'twin' && m.pair > m.id && canFight(m)) {
      const q = monById(s, m.pair);
      if (q && canFight(q)) {
        ctx.setLineDash([R(0.008), R(0.014)]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = colOf('twin', m.v)[2];
        ctx.beginPath();
        ctx.moveTo(mx, my - R(0.04));
        ctx.quadraticCurveTo((mx + X(q.x)) / 2, Math.min(my, Y(q.y)) - R(0.14), X(q.x), Y(q.y) - R(0.04));
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  // ── 깊이 순서로: 그림자 → 꿀단지 · 몬스터 · 구름 ──
  const items: { y: number; draw: () => void }[] = [];
  const potK = R(0.2);
  if (X(s.potX) < w + potK && s.phase !== 'pick') {
    items.push({
      y: 1.0,
      draw: () => {
        ctx.save();
        ctx.translate(X(s.potX + 0.02), Y(1.02));
        ctx.fillStyle = 'rgba(90,60,20,.2)';
        ell(ctx, 0, R(0.005), potK * 0.6, potK * 0.16);
        ctx.fill();
        drawPot(ctx, potK, t, s.phase === 'result' && s.ok ? 1 : 0);
        ctx.restore();
      },
    });
  }
  let anyCloud = false;
  for (const c of s.clouds) if (!c.dead && X(c.x) > -R(0.2) && X(c.x) < w + R(0.2)) anyCloud = true;
  for (const m of s.mons) {
    const mx = X(m.x), my = Y(m.y);
    if (mx < -R(0.25) || mx > w + R(0.25) || m.st === INC || m.st < 0) continue;
    items.push({
      y: m.y,
      draw: () => {
        const ds = depth(m.y) * (m.k === 'boss' ? 1 : 1), RR = R(m.r) * 1.18 * ds;
        let ex = 0, arm = 0, lx = 0, ly = 0, ox = 0, oy = 0, rot = 0, alpha = 1, walk = m.walk, sq = 1;
        const gc = m.st === IDLE && m.gk >= 0 ? cloudById(s, m.gk) : null;
        // 눈길: 구경 중이면 구름을, 아니면 가장 가까운 옆 놈을 흘끔
        if (gc) {
          const l = Math.hypot(gc.x - m.x, gc.y - m.y) || 1;
          lx = Math.abs(gc.x - m.x) / l;
          ly = (gc.y - m.y) / l - 0.3;
        } else if (m.st === IDLE || m.st === NOTICE) {
          let bd = 0.3 ** 2, bx = 0, by = 0;
          for (const o of s.mons) {
            if (o === m || !canFight(o)) continue;
            const q = (o.x - m.x) ** 2 + (o.y - m.y) ** 2;
            if (q < bd) (bd = q), (bx = o.x - m.x), (by = o.y - m.y);
          }
          const l = Math.hypot(bx, by);
          if (l > 0) (lx = (bx / l) * m.face), (ly = by / l);
        }
        switch (m.st) {
          case IDLE:
            ex = m.k === 'owl' && m.wind > 0 ? 9 : m.k === 'guard' ? (m.wind > 0 ? 8 : 7) : m.k === 'rabbit' && anyCloud ? 3 : gc ? ((Math.floor(t / 16) + m.id) % 4 === 0 ? 0 : 6) : 0;
            if (m.k === 'boss') ex = t - m.hitT < 40 ? 2 : anyCloud ? 8 : 0;
            // 구경꾼: 만세 하며 폴짝폴짝 '오오~'
            if (gc && !m.walk) (arm = 2), (oy = -Math.abs(Math.sin(t * 0.3 + m.id * 1.7)) * R(0.014));
            if (gc && !m.walk && (t + m.id * 13) % 70 === 0) say(m.x, m.y - m.r * 3.2, (m.id + Math.floor(t / 70)) % 3 ? '오오~' : '싸움이다!', '#ffffff', 13);
            break;
          case ENTER:
            walk = true;
            break;
          case DASH:
            ex = 2;
            arm = 1;
            rot = 0.18;
            break;
          case HIT: {
            const u = clamp((t - m.hitT) / HIT_T, 0, 1);
            if (m.tgt === T_VICTIM) (ex = 1), (ox = Math.sin(t * 2.2) * R(0.004)), (sq = 1 - 0.12 * Math.sin(u * Math.PI));
            else if (m.tgt === T_BOAR) (ex = 2), (ox = Math.sin(t * 2.4) * R(0.006));
            else (ex = 2), (arm = 1), (ox = m.dx * Math.sin(u * Math.PI) * R(0.03)), (oy = m.dy * Math.sin(u * Math.PI) * R(0.02));
            break;
          }
          case FLY:
            ex = 4;
            oy = -m.z * w * 0.8;
            rot = (t + m.seed) * 0.42;
            walk = false;
            break;
          case KO:
            ex = 4;
            rot = 1.45 * (m.seed % 2 ? 1 : -1) * m.face;
            oy = -RR * 0.5;
            alpha = clamp(m.tm / 18, 0, 1);
            walk = false;
            break;
          case SLEEP:
            ex = 5;
            break;
          case NOTICE:
            ex = 8;
            arm = 1;
            walk = true;
            break;
          case FLEE:
            ex = 3;
            walk = true;
            rot = 0.2;
            arm = 2;
            break;
          case DAZE:
            ex = 4;
            rot = Math.sin(t * 0.25 + m.seed) * 0.18;
            walk = false;
            break;
        }
        // 그림자
        if (alpha > 0.3) {
          ctx.fillStyle = 'rgba(90,60,20,.22)';
          ell(ctx, mx, my + R(0.004), RR * (m.st === FLY ? 0.6 : 0.95), RR * 0.28);
          ctx.fill();
        }
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(mx + ox, my + oy);
        if (m.st === FLY || m.st === KO) ctx.translate(0, -RR), ctx.rotate(rot), ctx.translate(0, RR);
        else if (rot) ctx.rotate(rot * m.face);
        const face = m.k === 'boar' ? (Math.cos(m.ang) >= 0 ? 1 : -1) : m.face;
        ctx.scale(face, sq);
        if (m.k === 'boar' && m.st === SLEEP && Math.abs(Math.sin(m.ang)) > 0.2) ctx.rotate(Math.sin(m.ang) * 0.5 * (face > 0 ? 1 : 1));
        drawMon(ctx, m.k, m.v, RR, { ex, lx, ly, t, walk: walk ? 1 : 0, seed: m.seed, ch: d.ch, arm });
        ctx.restore();
        // 머리 위 표시
        const top = my - RR * (m.k === 'boar' ? 1.7 : m.k === 'boss' ? 2.9 : 2.5);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (m.st === KO && alpha > 0.4) {
          for (let i = 0; i < 3; i++) {
            const a = t * 0.2 + (i * TAU) / 3;
            starPath(ctx, mx + Math.cos(a) * RR * 0.7, my - RR * 1.5 + Math.sin(a) * RR * 0.22, RR * 0.2, a);
            fs(ctx, '#ffe45c', 1.2);
          }
        } else if (m.st === SLEEP) {
          font(0.036, 900);
          for (let i = 0; i < 2; i++) {
            const u = ((t * 0.012 + i * 0.5) % 1);
            ctx.globalAlpha = 1 - u;
            text('z', mx + RR * (0.5 + u * 0.7), top + RR * 0.6 - u * RR * 1.2, '#ffffff', OUT, 3);
          }
          ctx.globalAlpha = 1;
        } else if (m.st === NOTICE) {
          const pulse = 1 + 0.18 * Math.sin(t * 0.5);
          ell(ctx, mx, top, R(0.03) * pulse, R(0.03) * pulse);
          fs(ctx, '#e8402f', 2.5, '#ffffff');
          font(0.044, 900);
          text('!', mx, top + R(0.002), '#ffffff');
          // 꿀밤까지 남은 시간 고리
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(mx, top, R(0.04), -Math.PI / 2, -Math.PI / 2 + TAU * (m.tm / NOTICE_T));
          ctx.stroke();
        } else if (m.k === 'guard' && m.st === IDLE) {
          // 순찰: 머리 위 눈금 (차면 '!')
          const a = clamp(m.wind / WATCH_T, 0, 1), gw = R(0.13), gh = R(0.028), hot = a > 0.6, pulse = hot ? 1 + 0.1 * Math.sin(t * 0.5) : 1;
          ctx.save();
          ctx.translate(mx + R(0.01), top + R(0.012));
          ctx.scale(pulse, pulse);
          rr(ctx, -gw / 2, -gh / 2, gw, gh, gh / 2);
          fs(ctx, '#fff6dc', 2.2);
          if (a > 0.02) {
            rr(ctx, -gw / 2 + 2, -gh / 2 + 2, Math.max(gh - 4, (gw - 4) * a), gh - 4, gh / 2);
            fs(ctx, hot ? '#e8402f' : '#ff9a3c');
          }
          ell(ctx, -gw / 2 - R(0.004), 0, R(0.024), R(0.016 + a * 0.008));
          fs(ctx, '#ffffff', 2.2);
          ell(ctx, -gw / 2 - R(0.008), 0, R(0.009), R(0.011));
          fs(ctx, hot ? '#e8402f' : '#2a1a10');
          ctx.restore();
        } else if (m.k === 'boss' && m.st === IDLE) {
          // 대장: 구름에 몇 마리가 있어야 삼켜지나
          const bw = R(0.16), bh = R(0.058);
          rr(ctx, mx - bw / 2, top - bh / 2, bw, bh, bh / 2);
          fs(ctx, '#fff6dc', 2.5);
          ell(ctx, mx - bw * 0.26, top, bh * 0.36, bh * 0.3);
          fs(ctx, '#fffaf0', 1.6);
          font(0.04, 900);
          text(`${s.bossNeed}+`, mx + bw * 0.14, top + 1, '#e8402f');
        }
      },
    });
  }
  // 숫자는 톡마다 하나: 그 톡의 구름 가운데 가장 큰 구름 위에만
  const numOn = new Map<number, Cloud>();
  for (const c of s.clouds) {
    if (c.dead) continue;
    const q = numOn.get(c.tap);
    if (!q || c.n > q.n) numOn.set(c.tap, c);
  }
  for (const c of s.clouds) {
    if (c.dead) continue;
    const cx = X(c.x), cy = Y(c.y);
    if (cx < -R(0.4) || cx > w + R(0.4)) continue;
    items.push({
      y: c.y + 0.02,
      draw: () => {
        const r = R(c.r) * 1.12, pop = clamp(1 - (t - c.popT) / 8, 0, 1);
        ctx.fillStyle = 'rgba(90,60,20,.2)';
        ell(ctx, cx, cy + R(0.006), r * 1.05, r * 0.3);
        ctx.fill();
        if (c.tor > 0) {
          // 빨아들이는 범위
          const rad = R(c.mega ? 0.5 : 0.42);
          ctx.strokeStyle = c.mega ? 'rgba(255,190,60,.5)' : 'rgba(127,143,240,.45)';
          ctx.lineWidth = 2;
          for (let i = 0; i < 3; i++) {
            const u = 1 - ((t * 0.02 + i / 3) % 1);
            ctx.globalAlpha = 1 - u;
            ell(ctx, cx, cy, rad * u, rad * u * 0.62);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
        const sp = Math.hypot(c.vx, c.vy);
        ctx.save();
        ctx.translate(cx, cy - r * 0.78 - Math.abs(Math.sin(c.age * 0.35)) * r * 0.08 * Math.min(1, sp * 120));
        drawBrawl(ctx, r, t, c, pop);
        ctx.restore();
        // 휘말린 수
        const num = s.tc[c.tap & 15];
        if (num >= 3 && c.tap > 1 && numOn.get(c.tap) === c) {
          const k = clamp(0.05 + num * 0.0035, 0.05, 0.11) * (1 + pop * 0.3);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          font(k, 900);
          text(`${num}`, cx, cy - r * 1.95, num >= 9 ? '#ff6f5e' : num >= 5 ? '#ff9a3c' : '#ffffff', OUT, 4.5);
        }
      },
    });
  }
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();

  // ── 여우 (앞줄) ──
  const foxH = R(0.205), fX = X(s.fx), fY = Y(FOX_Y);
  const hiding = play && s.blocked && s.kb <= 0;
  let nearCloud = false;
  for (const c of s.clouds) if (!c.dead && c.tap > 1 && Math.abs(c.x - s.fx) < 0.75) nearCloud = true;
  const pose = s.phase === 'result' ? (s.ok ? 6 : 5) : s.phase === 'pick' ? (s.pickSel >= 0 ? 6 : 3) : s.kb > 0 ? 5 : s.noticer >= 0 ? 4 : s.cloudWait || nearCloud || t - s.lastBurstT < 40 ? 3 : hiding ? 2 : s.run ? 1 : 0;
  ctx.fillStyle = 'rgba(60,80,30,.22)';
  ell(ctx, fX, fY + R(0.004), foxH * 0.36, foxH * 0.09);
  ctx.fill();
  ctx.save();
  ctx.translate(fX, fY - (s.kb > 0 ? Math.abs(Math.sin(s.kb * 0.28)) * R(0.05) : 0));
  if (s.kb > 0) ctx.rotate(-0.3);
  drawFox(ctx, foxH, pose, t, s.level, s.perkA, s.perkB);
  ctx.restore();
  if (hiding || (play && s.cloudWait && s.blockT > 6)) {
    const u = backOut(clamp(s.blockT / 10, 0, 1));
    ctx.save();
    ctx.translate(fX + foxH * 0.4, fY + R(0.016));
    ctx.scale(u, u);
    drawBush(ctx, foxH * 1.2, t, pose === 3 ? 1 : 0);
    ctx.restore();
  }
  tile(ctx, bg.front, cam * w, R(FR0), w, R(FR1 - FR0), w);

  // ── 들킴 게이지 (여우 머리 위 눈) ──
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (play && (s.alert > 0.02 || s.noticer >= 0)) {
    const a = clamp(s.alert, 0, 1), gx = fX, gy = fY - foxH * 1.12, gw = R(0.15), gh = R(0.03);
    const hot = a > 0.75 || s.noticer >= 0, pulse = hot ? 1 + 0.08 * Math.sin(t * 0.5) : 1;
    ctx.save();
    ctx.translate(gx, gy);
    ctx.scale(pulse, pulse);
    rr(ctx, -gw / 2, -gh / 2, gw, gh, gh / 2);
    fs(ctx, '#fff6dc', 2.2);
    if (a > 0.02) {
      rr(ctx, -gw / 2 + 2, -gh / 2 + 2, Math.max(gh - 4, (gw - 4) * a), gh - 4, gh / 2);
      fs(ctx, a > 0.75 ? '#e8402f' : a > 0.45 ? '#ff9a3c' : '#ffd24a');
    }
    // 눈
    ell(ctx, -gw / 2 - R(0.004), 0, R(0.026), R(0.018 + a * 0.008));
    fs(ctx, '#ffffff', 2.2);
    ell(ctx, -gw / 2 - R(0.004) + Math.sin(t * 0.1) * R(0.006), 0, R(0.009), R(0.011));
    fs(ctx, hot ? '#e8402f' : '#2a1a10');
    ctx.restore();
  }

  // ── 딱! (만화 칸 터짐) ──
  if (fx.memo.bkT !== undefined && t - fx.memo.bkT < 20) {
    const age = t - fx.memo.bkT, k = R(0.085) * (age < 5 ? 0.5 + age * 0.12 : 1.1 - (age - 5) * 0.012), bx = X(fx.memo.bkX) + R(0.03), by = Y(fx.memo.bkY) - R(0.16);
    ctx.globalAlpha = clamp((20 - age) / 6, 0, 1);
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(-0.15);
    ctx.beginPath();
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * TAU, q = i % 2 ? k * 0.72 : k * (1.12 + 0.12 * hsh(i + fx.memo.bkT));
      ctx.lineTo(Math.cos(a) * q * 1.15, Math.sin(a) * q * 0.8);
    }
    ctx.closePath();
    fs(ctx, '#ffe45c', 3);
    font(0.085 * (k / R(0.085)), 900);
    text('딱!', 0, k * 0.04, '#e8402f', '#ffffff', 5);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // ── 새 싸움꾼 스포트라이트 · 첫 판 손가락 ──
  if (play && s.spot && t - s.spot.t < 250) {
    const sk = s.spot.k;
    let tm: Mon | null = null;
    for (const m of s.mons) if (m.k === sk && m.st !== INC && m.st !== FLY && m.st !== KO && X(m.x) > R(0.08) && X(m.x) < w - R(0.08) && (!tm || m.x < tm.x)) tm = m;
    if (tm) {
      const mx = X(tm.x), my = Y(tm.y), rr0 = R(tm.r) * 1.5, by = my + rr0 * 0.75 + Math.sin(t * 0.2) * R(0.006);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 5]);
      ctx.lineDashOffset = -t * 0.5;
      ell(ctx, mx, my - rr0 * 0.6, rr0 * 1.25, rr0 * 1.25);
      ctx.stroke();
      ctx.setLineDash([]);
      font(0.034, 900);
      const label = sk === 'boss' ? d.boss!.name : KNAME[sk], bw = ctx.measureText(label).width + R(0.06), bh = R(0.058);
      rr(ctx, mx - bw / 2, by - bh / 2, bw, bh, bh / 2);
      fs(ctx, '#ff5a3c', 2.2, '#ffffff');
      text(label, mx, by + 1, '#ffffff');
    }
  }
  if (play && s.stage === 0 && s.taps === 0 && s.st > 20) {
    let tm: Mon | null = null;
    for (const m of s.mons) if (m.g === 0 && tappable(m) && (!tm || m.y > tm.y)) tm = m;
    if (tm) {
      const u = (t % 60) / 60, press = u > 0.55 && u < 0.8 ? 1 : 0, hx = X(tm.x) + R(0.02), hy = Y(tm.y) - R(0.03);
      if (press) {
        ctx.strokeStyle = 'rgba(255,255,255,.9)';
        ctx.lineWidth = 3;
        ell(ctx, hx - R(0.02), hy - R(0.02), R(0.05 + (u - 0.55) * 0.2), R(0.05 + (u - 0.55) * 0.2));
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(hx, hy + (press ? 0 : R(0.03) * Math.sin(u * Math.PI)));
      drawHand(ctx, R(0.085), press);
      ctx.restore();
    }
  }

  // ── 장 끝: 세상 속 큰 물건 둘 중 하나 ──
  if (s.phase === 'pick') {
    const ch = d.ch, pk = PICKS[ch], sel = s.pickSel, ap = backOut(clamp(s.pt / 22, 0, 1)), since = s.pt - 2000;
    for (let i = 0; i < 2; i++) {
      const px = w * (i ? 0.73 : 0.27), py = Y(0.9), k = R(0.14);
      const chosen = sel === i, gone = sel >= 0 && !chosen;
      ctx.save();
      ctx.globalAlpha = gone ? clamp(1 - since / 14, 0, 1) : 1;
      ctx.translate(px, py + (1 - ap) * R(0.5));
      // 받침 기둥
      ctx.fillStyle = 'rgba(90,60,20,.22)';
      ell(ctx, 0, R(0.01), k * 1.05, k * 0.26);
      ctx.fill();
      rr(ctx, -k * 0.8, -k * 0.5, k * 1.6, k * 0.55, k * 0.1);
      fs(ctx, '#f1e3c6', 2.6);
      rr(ctx, -k * 0.95, -k * 0.62, k * 1.9, k * 0.2, k * 0.08);
      fs(ctx, '#fff6dc', 2.6);
      // 빛기둥
      const lg = ctx.createLinearGradient(0, -k * 3.4, 0, -k * 0.6);
      lg.addColorStop(0, 'rgba(255,250,200,0)');
      lg.addColorStop(1, 'rgba(255,250,200,.55)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(-k * 0.5, -k * 3.4);
      ctx.lineTo(k * 0.5, -k * 3.4);
      ctx.lineTo(k * 0.95, -k * 0.6);
      ctx.lineTo(-k * 0.95, -k * 0.6);
      ctx.fill();
      ctx.save();
      const bobY = Math.sin(t * 0.08 + i * 2) * k * 0.08, grow = chosen ? 1 + 0.25 * Math.sin(clamp(since / 20, 0, 1) * Math.PI) : 1;
      ctx.translate(0, -k * 1.5 + bobY);
      ctx.scale(grow, grow);
      drawPerk(ctx, ch * 2 + i, k * 1.05, t);
      ctx.restore();
      // 이름표
      const bw = R(0.43), bh = R(0.125);
      rr(ctx, -bw / 2, k * 0.14, bw, bh, R(0.025));
      fs(ctx, chosen ? '#ffe680' : '#fff6dc', 2.6);
      font(0.046, 900);
      text(pk[i].name, 0, k * 0.14 + bh * 0.32, '#4a2e1a');
      font(0.033, 700);
      text(pk[i].line, 0, k * 0.14 + bh * 0.72, '#7a5a3a');
      ctx.restore();
    }
  }
  ctx.restore();

  // ───────── 사건 → 연출 · 소리 ─────────
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const ex = X(e.x), ey = Y(e.y), n = e.n ?? 0;
    switch (e.kind) {
      case 'tap':
        fx.ring(ex, ey - R(0.04), '#ffffff', R(0.09), 4);
        fx.sound('tick', 1.2, 0.8);
        break;
      case 'cool':
      case 'none':
        fx.ring(ex, ey, 'rgba(255,255,255,.7)', R(0.03), 2);
        fx.sound('tick', 0.6, 0.4);
        break;
      case 'dash':
        fx.sound('whoosh', 1.3, 0.5);
        puff(ex, ey, '#f4e6c8', 4, 2, 3);
        break;
      case 'bonk':
        fx.memo.bkT = t;
        fx.memo.bkX = e.x;
        fx.memo.bkY = e.y;
        puff(ex, ey - R(0.07), '#ffe45c', 8, 3.4, 3);
        fx.ring(ex, ey - R(0.06), '#ffe45c', R(0.08), 4);
        fx.kick(3);
        fx.sound('crack', 1 + Math.min(0.5, (n - 1) * 0.12), 1);
        fx.sound('boing', 1.5, 0.35);
        break;
      case 'solo':
        say(e.x, e.y - 0.12, '에잇!');
        fx.sound('boing', 1.3, 0.5);
        break;
      case 'cloud':
        puff(ex, ey - R(0.04), '#fff6e6', 10, 3, 4);
        fx.sound('thud', 1.3, 0.7);
        if (n >= 2) {
          say(e.x, e.y - 0.22, `연쇄 ×${n}!`, '#ffe45c', 17);
          fx.sound('zap', 0.9 + n * 0.12, 0.7);
          fx.ring(ex, ey - R(0.04), '#ffe45c', R(0.16), 5);
        }
        break;
      case 'swallow':
        puff(ex, ey - R(0.04), '#fff6e6', 4, 2.4, 3);
        fx.sound('pop', 0.9 + Math.min(1.4, n * 0.07), 0.8);
        break;
      case 'wow':
        band(e.text ?? '', `동전 ×${WOW_MUL[n]}`, WOW_COL[n]);
        fx.kick(5 + n * 2);
        fx.blink('#fff6c2', 0.22 + n * 0.05);
        fx.sound(n >= 2 ? 'clear' : 'chime', 1 + n * 0.08, 1);
        puff(ex, ey - R(0.08), WOW_COL[n], 14, 5, 4);
        break;
      case 'link':
        band(e.text ?? '', n >= 2 ? '와아아!' : '', LINK_COL[n]);
        fx.kick(7 + n * 3);
        fx.blink('#eafff6', 0.25 + n * 0.08);
        fx.sound('clear', 1.15 + n * 0.12, 1.1);
        fx.sound('swell', 1 + n * 0.15, 0.7);
        for (const col of ['#ffffff', LINK_COL[n], '#ffe45c']) puff(ex, ey - R(0.1), col, 10, 6, 4);
        break;
      case 'burst': {
        const big = Math.min(12, n);
        puff(ex, ey - R(0.06), '#fff6e6', 8 + big * 2, 3.5 + big * 0.3, 4.5);
        puff(ex, ey - R(0.06), '#ffe45c', 4 + big, 4 + big * 0.3, 3);
        fx.ring(ex, ey - R(0.05), '#ffffff', R(0.12 + big * 0.012), 5);
        fx.kick(3 + big * 0.7);
        fx.sound('thud', Math.max(0.55, 1.25 - big * 0.06), 0.9 + big * 0.04);
        fx.sound('splash', 1.1, 0.5);
        fx.sound('coin', 1 + Math.min(0.8, big * 0.06), 0.7);
        if (e.text && e.text !== '0') say(e.x, e.y - 0.15, `+${coins(Number(e.text))}`, '#ffe45c', 15 + big);
        break;
      }
      case 'land':
        puff(ex, ey, '#f1dfba', 3, 1.8, 3);
        fx.sound(n ? 'boing' : 'thud', n ? 1.2 : 1.7, n ? 0.8 : 0.3);
        break;
      case 'angry':
        say(e.x, e.y - 0.14, '어쭈?!', '#ff6f5e', 16);
        fx.sound('zap', 1.2, 0.5);
        break;
      case 'wake':
        say(e.x, e.y - 0.13, '응?!', '#ffffff', 16);
        fx.sound('boing', 0.7, 0.8);
        break;
      case 'charge':
        say(e.x, e.y - 0.15, '돌진!', '#ff6f5e', 19);
        puff(ex, ey, '#f1dfba', 10, 4, 4);
        fx.kick(4);
        fx.sound('whoosh', 0.7, 1);
        fx.sound('thud', 0.8, 0.8);
        break;
      case 'twin':
        say(e.x, e.y - 0.14, '내 짝꿍을?!', '#ffe45c', 15);
        fx.sound('whoosh', 1.1, 0.8);
        break;
      case 'cracker':
        for (const [i, col] of ['#ff6f5e', '#ffd24a', '#7be0c3', '#7bb7ff'].entries()) puff(ex + Math.cos(i * 1.6) * R(0.06), ey - R(0.1) + Math.sin(i * 1.6) * R(0.05), col, 9, 5, 3.5);
        say(e.x, e.y - 0.24, '피융~ 펑!', '#ffffff', 20);
        fx.ring(ex, ey - R(0.08), '#ffd24a', R(0.2), 6);
        fx.kick(7);
        fx.blink('#fff2c9', 0.25);
        fx.sound('crack', 1.4, 1);
        fx.sound('ding', 0.9, 0.7);
        break;
      case 'tornado':
        say(e.x, e.y - 0.24, '회오리!', '#c9d0ff', 20);
        fx.ring(ex, ey, '#9fb0ff', R(0.3), 5);
        fx.sound('swell', 0.8, 1);
        break;
      case 'puff':
        fx.sound('tick', 0.9, 0.7);
        break;
      case 'whistle':
        say(e.x, e.y - 0.18, '삐익!', '#ffffff', 22);
        fx.ring(ex, ey - R(0.05), '#e8402f', R(OWL_R), 5);
        fx.kick(4);
        fx.sound('zap', 2.2, 0.9);
        fx.sound('ding', 1.6, 0.5);
        break;
      case 'flee':
        say(e.x, e.y - 0.13, '꺅!', '#ffffff', 15);
        fx.sound('boing', 1.9, 0.5);
        break;
      case 'bump':
        puff(ex, ey - R(0.05), '#ffe45c', 6, 3, 3);
        say(e.x, e.y - 0.13, '쿵!', '#ffffff', 16);
        break;
      case 'kick':
        band('뻥!', `이제 한 방 ${n}마리면 돼요`, '#ff9a3c');
        fx.ring(ex, ey - R(0.1), '#ffffff', R(0.2), 6);
        fx.kick(7);
        fx.sound('boing', 0.6, 1.1);
        fx.sound('thud', 0.9, 0.7);
        break;
      case 'bossin':
        band('꿀꺽!', '대장까지 한 구름', '#ffb52e');
        fx.kick(9);
        fx.blink('#fff2c9', 0.35);
        fx.sound('swell', 0.6, 1.2);
        fx.sound('thud', 0.6, 1.1);
        break;
      case 'mega':
        for (const col of ['#ff6f5e', '#ffd24a', '#7be0c3', '#ffffff']) puff(ex, ey - R(0.1), col, 16, 7, 5);
        fx.ring(ex, ey - R(0.08), '#ffe45c', R(0.5), 8);
        fx.kick(14);
        fx.blink('#ffffff', 0.5);
        fx.sound('clear', 0.8, 1.2);
        fx.sound('thud', 0.5, 1.3);
        break;
      case 'wave':
        fx.sound('whoosh', 0.9, 0.35);
        break;
      case 'guard':
        fx.sound('whoosh', 0.8, 0.5);
        fx.sound('tick', 0.7, 0.8);
        break;
      case 'spot':
        say(e.x, e.y - 0.17, '킁킁…', '#ffd9a0', 14);
        fx.sound('tick', 0.7, 0.9);
        break;
      case 'notice':
        say(e.x, e.y - 0.2, '거기 누구야!', '#ff6f5e', 16);
        fx.sound('zap', 0.6, 0.9);
        fx.sound('tick', 0.8, 0.8);
        fx.kick(3);
        break;
      case 'phew':
        say(e.x + 0.04, FOX_Y - 0.27, '휴~', '#ffffff', 17);
        fx.sound('ding', 0.8, 0.5);
        break;
      case 'bonkfox':
        say(e.x + 0.04, FOX_Y - 0.27, '꿀밤!', '#ff6f5e', 24);
        puff(ex, ey - R(0.18), '#ffe45c', 12, 4, 4);
        fx.kick(10);
        fx.blink('#ff8f7a', 0.35);
        fx.sound('thud', 1, 1.1);
        fx.sound('fail', 1.1, 0.8);
        break;
      case 'merge':
        say(e.x, e.y - 0.26, '합체!', '#ffe45c', 19);
        fx.ring(ex, ey - R(0.05), '#ffffff', R(0.18), 5);
        fx.kick(4);
        fx.sound('swell', 1.2, 0.8);
        break;
      case 'bee':
        puff(ex, ey - R(0.06), '#ffd24a', 6, 3, 2.5);
        say(e.x, e.y - 0.14, '따끔!', '#ffe45c', 15);
        fx.sound('zap', 1.8, 0.5);
        break;
      case 'wall':
        fx.sound('boing', 1, 0.4);
        break;
      case 'clear':
        for (const col of ['#ffd24a', '#ff9a3c', '#ffffff']) puff(ex, ey - R(0.2), col, 12, 5, 4);
        fx.sound('clear', 1, 1);
        break;
      case 'fail':
        fx.sound('fail', 0.8, 1);
        break;
      case 'pickopen':
        fx.sound('swell', 1, 0.8);
        break;
      case 'pick':
        for (const col of ['#ffd24a', '#ffffff', '#ff93b6']) puff(e.x * w, Y(0.8), col, 12, 5, 4);
        fx.ring(e.x * w, Y(0.82), '#ffe45c', R(0.25), 6);
        fx.sound('chime', 1.1, 1);
        fx.sound('swell', 1.3, 0.7);
        break;
    }
  }
  // 여우의 킥킥 — 싸움을 구경하는 동안
  if (play && t !== seenT && pose === 3 && t % 44 === 0) say(s.fx + 0.05, FOX_Y - 0.26, '킥킥', '#ffffff', 13), fx.sound('tick', 1.6, 0.3);
  fx.memo.t = t;
  // 도감 그림자 그림은 판 도중에 네 틱에 하나씩 미리 만들어 둔다 (결과 화면 첫 프레임이 끊기지 않게 — 한 번만 드는 값)
  if (play && t % 4 === 0) {
    for (const e of DEX) {
      const r0 = Math.round(R(e.k === 'boss' || e.k === 'bear' ? 0.03 : e.k === 'boar' ? 0.028 : 0.026));
      if (shadeCache.has(`${e.k}|${e.ch}|${r0}`)) continue;
      shade(e.k, e.ch, r0);
      break;
    }
  }

  // ───────── 화면 위 글자 ─────────
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // 작은 반응 글자 (같은 자리에 하나만)
  tx.small = tx.small.filter((q) => t - q.t < 46);
  for (const q of tx.small) {
    const age = t - q.t, k = age < 5 ? 0.6 + age * 0.08 : 1;
    ctx.globalAlpha = Math.min(1, (46 - age) / 12);
    ctx.font = `800 ${Math.max(12, (q.size * w) / 380) * k}px system-ui, sans-serif`;
    const half = ctx.measureText(q.str).width / 2 + 5;
    text(q.str, clamp(X(q.x), half, Math.max(half, w - half)), Y(q.y) - age * R(0.0016), q.col, 'rgba(60,36,16,.75)', 3.5);
  }
  ctx.globalAlpha = 1;
  // 가운데 큰 띠 (하나만)
  if (tx.big && wowAge >= 0 && wowAge < 70) {
    const b0 = tx.big, a = Math.min(1, (70 - wowAge) / 12), k = wowAge < 7 ? 1.7 - 0.7 * (wowAge / 7) : 1, by = Y(0.4);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(w / 2, by);
    ctx.rotate(-0.04);
    ctx.fillStyle = b0.col;
    ctx.beginPath();
    ctx.moveTo(-w * 0.6, -R(0.07));
    ctx.lineTo(w * 0.6, -R(0.085));
    ctx.lineTo(w * 0.6, R(0.07));
    ctx.lineTo(-w * 0.6, R(0.085));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(-w * 0.6, -R(0.085), w * 1.2, R(0.014));
    ctx.fillRect(-w * 0.6, R(0.064), w * 1.2, R(0.014));
    ctx.scale(k, k);
    font(b0.str.length > 8 ? 0.062 : 0.078, 900);
    const tw0 = ctx.measureText(b0.str).width;
    font(0.04, 900);
    const tw1 = b0.sub ? ctx.measureText(b0.sub).width + R(0.03) : 0, x0 = -(tw0 + tw1) / 2;
    font(b0.str.length > 8 ? 0.062 : 0.078, 900);
    text(b0.str, x0 + tw0 / 2, 0, '#ffffff', OUT, 5);
    if (b0.sub) {
      font(0.04, 900);
      text(b0.sub, x0 + tw0 + tw1 / 2 + R(0.01), R(0.006), '#fff6c2', OUT, 4);
    }
    ctx.restore();
  }
  // 첫 판 안내 한 줄
  if (play && s.stage === 0 && s.taps === 0) {
    const bw = R(0.86), bh = R(0.085), by = Y(0.2);
    rr(ctx, w / 2 - bw / 2, by - bh / 2, bw, bh, bh / 2);
    fs(ctx, 'rgba(255,246,220,.95)', 2.5);
    font(0.044, 800);
    text("👆 톡! 하면 옆 놈을 '딱!' — 싸움이 붙어요", w / 2, by + 1, '#4a2e1a');
  }
  // 새 소식
  if (play && s.news) {
    const age = t - s.news.t, a = clamp(Math.min(age / 10, (210 - age) / 14), 0, 1), by = Y(0.2) - (1 - a) * R(0.05);
    ctx.globalAlpha = a;
    font(0.038, 800);
    const tip = s.news.text.startsWith('팁:'), ntext = tip ? s.news.text.slice(2) : s.news.text;
    const tw = Math.min(w * 0.96, ctx.measureText(ntext).width + R(0.19)), bh = R(0.08);
    rr(ctx, w / 2 - tw / 2, by - bh / 2, tw, bh, bh / 2);
    fs(ctx, 'rgba(255,246,220,.96)', 2.5);
    rr(ctx, w / 2 - tw / 2 + R(0.012), by - bh / 2 + R(0.012), R(0.11), bh - R(0.024), bh / 2);
    fs(ctx, tip ? '#4aa8f0' : '#ff5a3c');
    font(0.03, 900);
    text(tip ? '숫자' : 'NEW', w / 2 - tw / 2 + R(0.067), by + 1, '#ffffff');
    font(0.038, 800);
    ctx.textAlign = 'left';
    text(ntext, w / 2 - tw / 2 + R(0.135), by + 1, '#4a2e1a');
    ctx.textAlign = 'center';
    ctx.globalAlpha = 1;
  }
  if (s.phase === 'pick') {
    const by = Y(0.22), bw = R(0.7), bh = R(0.1), a = clamp(s.pt / 14, 0, 1);
    ctx.globalAlpha = s.pickSel >= 0 ? clamp(1 - (s.pt - 2000) / 20, 0, 1) : a;
    rr(ctx, w / 2 - bw / 2, by - bh / 2, bw, bh, bh / 2);
    fs(ctx, 'rgba(255,246,220,.96)', 2.5);
    font(0.05, 900);
    text('둘 중 하나를 톡!', w / 2, by + 1, '#4a2e1a');
    ctx.globalAlpha = 1;
    if (s.pickSel >= 0) {
      font(0.06, 900);
      const u = clamp((s.pt - 2000) / 10, 0, 1);
      ctx.globalAlpha = u;
      text(`${PICKS[d.ch][s.pickSel].name} 챙겼다!`, w / 2, Y(0.36), '#ffffff', OUT, 5);
      ctx.globalAlpha = 1;
    }
  }

  // ── 위 띠: 판 · 길 · 하트 · 동전 ──
  const hudH = R(0.118);
  ctx.fillStyle = 'rgba(74,46,26,.86)';
  ctx.fillRect(0, 0, w, hudH);
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  ctx.fillRect(0, hudH - 2, w, 2);
  ctx.textAlign = 'left';
  font(0.04, 900);
  text(`${d.ch + 1}-${(s.stage % 4) + 1}`, R(0.03), R(0.036), '#ffd24a');
  font(0.034, 700);
  text(d.name, R(0.125), R(0.037), '#fff6dc');
  // 하트
  for (let i = 0; i < 3; i++) {
    heartPath(ctx, w - R(0.05) - i * R(0.062), R(0.036), R(0.022));
    fs(ctx, i < s.hearts ? '#ff5a6a' : 'rgba(255,255,255,.18)', 1.6, '#2a1a10');
  }
  // 모은 별
  ctx.textAlign = 'right';
  starPath(ctx, w - R(0.52), R(0.035), R(0.021));
  fs(ctx, '#ffd24a', 1.4, '#2a1a10');
  font(0.036, 900);
  ctx.textAlign = 'left';
  text(String(s.stars), w - R(0.492), R(0.038), '#fff6dc');
  ctx.textAlign = 'right';
  // 동전
  ctx.textAlign = 'right';
  ell(ctx, w - R(0.25), R(0.036), R(0.02), R(0.02));
  fs(ctx, '#ffd24a', 1.6, '#2a1a10');
  font(0.036, 900);
  const shown = Math.round((fx.memo.pts = (fx.memo.pts ?? s.pts) + (s.pts - (fx.memo.pts ?? s.pts)) * 0.2));
  text(coins(Math.abs(shown - s.pts) < 2 ? s.pts : shown), w - R(0.285), R(0.038), '#fff6dc');
  // 길 진행 막대: 여우 → 꿀단지
  const px0 = R(0.05), px1 = w - R(0.07), py = R(0.088), prog = clamp((s.fx - 0.13) / (s.potX - 0.23), 0, 1);
  rr(ctx, px0, py - R(0.008), px1 - px0, R(0.016), R(0.008));
  fs(ctx, 'rgba(255,255,255,.2)');
  rr(ctx, px0, py - R(0.008), Math.max(R(0.016), (px1 - px0) * prog), R(0.016), R(0.008));
  fs(ctx, '#ffb347');
  if (d.boss && !s.bossGone) {
    const bxp = px0 + (px1 - px0) * clamp((s.L - 0.6 - 0.13) / (s.potX - 0.23), 0, 1);
    ell(ctx, bxp, py, R(0.015), R(0.015));
    fs(ctx, BOSSCOL[d.ch][0], 1.5, '#2a1a10');
  }
  ell(ctx, px1 + R(0.022), py, R(0.017), R(0.019));
  fs(ctx, '#ffb347', 1.6, '#2a1a10');
  ell(ctx, px1 + R(0.022), py - R(0.014), R(0.014), R(0.006));
  fs(ctx, '#ffe680', 1.2, '#2a1a10');
  // 여우 머리 표시
  const fxp = px0 + (px1 - px0) * prog;
  ctx.beginPath();
  ctx.moveTo(fxp - R(0.016), py - R(0.006));
  ctx.lineTo(fxp - R(0.012), py - R(0.026));
  ctx.lineTo(fxp - R(0.002), py - R(0.014));
  ctx.lineTo(fxp + R(0.008), py - R(0.026));
  ctx.lineTo(fxp + R(0.014), py - R(0.006));
  ctx.closePath();
  fs(ctx, '#ff9a3c', 1.4, '#2a1a10');
  ell(ctx, fxp, py, R(0.018), R(0.015));
  fs(ctx, '#ff9a3c', 1.4, '#2a1a10');

  // ── 아래 띠: 별 셋 (쉬운 말) · 장난 레벨 ──
  const by0 = R(GR1), bh0 = h - by0;
  ctx.fillStyle = 'rgba(74,46,26,.9)';
  ctx.fillRect(0, by0, w, bh0);
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  ctx.fillRect(0, by0, w, 2);
  const starLines = ['꿀단지까지 가기', '꿀밤 안 맞기', `톡 한 번에 ${d.need}마리`];
  const okNow = [s.phase === 'result' && s.ok, s.hits === 0, s.bestTap >= d.need];
  ctx.textAlign = 'left';
  for (let i = 0; i < 3; i++) {
    const ly = by0 + bh0 * (0.2 + i * 0.3), on = okNow[i] || (i === 1 && play);
    starPath(ctx, R(0.05), ly, R(0.021));
    fs(ctx, okNow[i] ? '#ffd24a' : i === 1 && play ? 'rgba(255,210,74,.45)' : 'rgba(255,255,255,.2)', 1.2, '#2a1a10');
    font(0.036, 700);
    text(starLines[i], R(0.09), ly + 1, on ? '#fff6dc' : 'rgba(255,246,220,.72)');
    if (i === 2 && !okNow[2] && s.bestTap > 1) {
      ctx.fillStyle = '#ffd24a';
      font(0.034, 800);
      ctx.fillText(`(${s.bestTap}/${d.need})`, R(0.1) + ctx.measureText(starLines[2]).width + R(0.015), ly + 1);
    }
  }
  // 장난 레벨 딱지
  {
    const bx = w - R(0.29), bw = R(0.26), ly = by0 + bh0 * 0.34, lvPop = clamp(1 - (t - s.lvT) / 30, 0, 1);
    rr(ctx, bx, ly - R(0.036), bw, R(0.072), R(0.02));
    fs(ctx, lvPop > 0 ? '#ffe680' : '#fff6dc', 2, '#2a1a10');
    ctx.textAlign = 'center';
    font(0.03, 800);
    text('장난 레벨', bx + bw * 0.38, ly + 1, '#7a5a3a');
    font(0.046, 900);
    text(String(s.level + 1), bx + bw * 0.82, ly + 1, '#e8793f');
    // 장 끝 물건
    font(0.03, 700);
    const perks = [s.perkA ? PICKS[0][s.perkA - 1].name : '', s.perkB ? PICKS[1][s.perkB - 1].name : ''].filter(Boolean).join(' · ');
    text(perks || '구름이 점점 커져요', bx + bw / 2, by0 + bh0 * 0.78, 'rgba(255,246,220,.8)');
  }

  // ── 결과 화면 ──
  if (s.phase === 'result') drawResult(ctx, s, w, h, fx, R, Y, font, text);
  void th;
}

const shadeCache = new Map<string, HTMLCanvasElement>();
/** 몬스터 그림자 그림 (도감의 아직 못 본 칸) — 한 번 그려 두고 쓴다 */
function shade(k: K, ch: number, r: number): HTMLCanvasElement {
  const key = `${k}|${ch}|${r}`;
  let c = shadeCache.get(key);
  if (c) return c;
  c = layer(r * 5, r * 5, 2, (g) => {
    g.translate(r * 2.5, r * 4.3);
    drawMon(g, k, 0, r, { ex: 0, lx: 0, ly: 0, t: 0, walk: 0, seed: 0, ch, arm: 0 });
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = 'rgba(90,70,50,.55)';
    g.fillRect(0, 0, r * 10, r * 10);
  });
  if (shadeCache.size > 40) shadeCache.clear();
  shadeCache.set(key, c);
  return c;
}
type FontFn = (sz: number, wgt?: number) => string;
type TextFn = (str: string, x: number, y: number, fill: string, stroke?: string, lw?: number) => void;
function drawResult(ctx: C2, s: BrawlState, w: number, h: number, fx: ReturnType<typeof juice>, R: (r: number) => number, Y: (y: number) => number, font: FontFn, text: TextFn) {
  const d = STAGES[s.stage], pt = s.pt, t = s.t, a = clamp(pt / 12, 0, 1);
  ctx.fillStyle = `rgba(60,36,16,${0.42 * a})`;
  ctx.fillRect(0, 0, w, h);
  const pw = w * 0.88, ph = R(s.ok ? 1.01 : 0.5), px = (w - pw) / 2, py = Y(0.19) + (1 - backOut(a)) * R(0.2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  rr(ctx, px, py, pw, ph, R(0.045));
  fs(ctx, '#fff6dc', 3.5);
  rr(ctx, px, py, pw, R(0.13), R(0.045));
  fs(ctx, s.ok ? '#ffb347' : '#b9a48a', 3.5);
  font(0.062, 900);
  if (!s.ok) {
    text('들켰다…!', w / 2, py + R(0.068), '#ffffff', OUT, 5);
    font(0.042, 800);
    text(`${s.stage + 1}판까지 · 동전 ${coins(s.pts)}`, w / 2, py + R(0.23), '#4a2e1a');
    font(0.036, 700);
    text(`싸움 붙인 몬스터 ${s.kos}마리`, w / 2, py + R(0.32), '#7a5a3a');
    text('붐빌 때 한 방에! 다시 해 봐요', w / 2, py + R(0.4), '#7a5a3a');
    return;
  }
  text(s.won ? '꿀단지를 다 먹었다!' : d.boss ? `${CHAPTER[d.ch]} 끝! 냠냠` : '꿀단지 냠냠!', w / 2, py + R(0.068), '#ffffff', OUT, 5);
  // 별 셋
  const lines = ['꿀단지까지 가기', '꿀밤 안 맞기', `톡 한 번에 ${d.need}마리`];
  for (let i = 0; i < 3; i++) {
    const at0 = 16 + i * 16, u = clamp((pt - at0) / 9, 0, 1), ly = py + R(0.2 + i * 0.082), on = s.starOk[i];
    if (pt === at0 + 1 && fx.memo['st' + i] !== s.stage) (fx.memo['st' + i] = s.stage), fx.sound(on ? 'ding' : 'tick', on ? 1 + i * 0.18 : 0.6, on ? 0.9 : 0.5);
    ctx.globalAlpha = u;
    const k = on ? backOut(u) : 1;
    starPath(ctx, px + R(0.1), ly, R(0.034) * k, on ? (1 - u) * 2 : 0);
    fs(ctx, on ? '#ffd24a' : '#e6d8ba', 2.4);
    ctx.textAlign = 'left';
    font(0.042, 800);
    text(lines[i], px + R(0.16), ly + 1, on ? '#4a2e1a' : '#a8946e');
    if (i === 2) {
      ctx.textAlign = 'right';
      font(0.038, 800);
      text(`최고 ${s.bestTap}마리`, px + pw - R(0.05), ly + 1, on ? '#e8793f' : '#a8946e');
    }
    ctx.textAlign = 'center';
    ctx.globalAlpha = 1;
  }
  // 장난 레벨 (저절로 오른다)
  {
    const u = clamp((pt - 62) / 14, 0, 1), ly = py + R(0.47);
    if (pt === 63 && fx.memo.lvS !== s.stage) (fx.memo.lvS = s.stage), fx.sound('swell', 1.2, 0.8), (s.lvT = s.t);
    ctx.globalAlpha = clamp((pt - 56) / 8, 0, 1);
    rr(ctx, px + R(0.04), ly - R(0.05), pw - R(0.08), R(0.1), R(0.03));
    fs(ctx, '#ffe9b0', 2.4);
    ctx.textAlign = 'left';
    font(0.04, 900);
    text('장난 레벨', px + R(0.075), ly - R(0.012), '#4a2e1a');
    font(0.03, 700);
    text('구름이 더 크게 · 더 멀리', px + R(0.075), ly + R(0.026), '#7a5a3a');
    ctx.textAlign = 'center';
    font(0.05, 900);
    text(String(s.level), px + pw * 0.62, ly + 1, '#b89a6a');
    font(0.04, 900);
    text('▶', px + pw * 0.72, ly + 1, '#e8793f');
    ctx.save();
    ctx.translate(px + pw * 0.84, ly + 1);
    const k = 1 + 0.5 * Math.sin(u * Math.PI);
    ctx.scale(k, k);
    font(0.066, 900);
    text(String(s.level + 1), 0, 0, '#e8793f', '#ffffff', 4);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  // 도감: 싸움 붙여 본 몬스터 · 다음에 나올 놈
  {
    const ly = py + R(0.61), a2 = clamp((pt - 74) / 10, 0, 1);
    ctx.globalAlpha = a2;
    ctx.textAlign = 'left';
    font(0.034, 800);
    let got = 0;
    for (const e of DEX) if (s.dex[e.key]) got++;
    text(`도감 ${got}/${DEX.length}`, px + R(0.05), ly, '#7a5a3a');
    ctx.textAlign = 'center';
    const cw = (pw - R(0.08)) / 6;
    for (let i = 0; i < DEX.length; i++) {
      const e = DEX[i], cx = px + R(0.04) + cw * ((i % 6) + 0.5), cy = ly + R(0.105) + Math.floor(i / 6) * R(0.135), seen = !!s.dex[e.key], next = i === s.stage + 1;
      rr(ctx, cx - cw * 0.44, cy - R(0.052), cw * 0.88, R(0.104), R(0.02));
      fs(ctx, next ? '#ffe680' : seen ? '#ffffff' : '#eadfc6', next ? 2.6 : 1.6, next ? '#e8793f' : '#b89a6a');
      const rr0 = R(e.k === 'boss' ? 0.03 : e.k === 'bear' ? 0.03 : e.k === 'boar' ? 0.028 : 0.026);
      if (seen) {
        ctx.save();
        ctx.translate(cx, cy + R(0.036));
        drawMon(ctx, e.k, 0, rr0, { ex: 0, lx: 0, ly: 0, t, walk: 0, seed: i, ch: e.ch, arm: 0 });
        ctx.restore();
      } else {
        // 아직 못 본 놈은 그림자로
        const im = shade(e.k, e.ch, Math.round(rr0));
        ctx.drawImage(im, cx - im.width / 4, cy + R(0.036) - (im.height / 2) * 0.86, im.width / 2, im.height / 2);
        font(0.04, 900);
        text('?', cx, cy + R(0.004), next ? '#e8793f' : '#ffffff');
      }
      if (next) {
        font(0.026, 900);
        rr(ctx, cx - R(0.04), cy - R(0.07), R(0.08), R(0.036), R(0.018));
        fs(ctx, '#e8793f');
        text('다음', cx, cy - R(0.051), '#ffffff');
      }
    }
    ctx.globalAlpha = 1;
  }
  // 넘기기
  if (pt > RESULT_MIN) {
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 0.15);
    font(0.04, 800);
    text(s.won ? '톡 하면 끝!' : d.boss && d.ch < PICKS.length ? '톡 하면 선물 고르기' : '톡 하면 다음 판', w / 2, py + ph - R(0.045), '#e8793f');
    ctx.globalAlpha = 1;
  }
}

/** 측정·스냅샷용: k판(0부터)으로 건너뛴다 (장난 레벨·장 끝 선택도 그 판에 맞춘다) */
export function jumpTo(s: BrawlState, k: number, perkA = 1, perkB = 1) {
  s.stage = clamp(k, 0, STAGES.length - 1);
  s.level = s.stage;
  s.perkA = s.stage >= 4 ? perkA : 0;
  s.perkB = s.stage >= 8 ? perkB : 0;
  s.events = [];
  newStage(s);
}
/** 측정용 속 들여다보기 */
export const brawlstartDebug = { cloneSim, tapMon, runSim, tappable, world };
